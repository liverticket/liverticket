import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, actor, fixture, requestData, orderData, api } from "./helpers.mjs";
import { deleteEvent } from "../../lib/delete-event.mjs";
import { calendarDate } from "../../lib/event-date.mjs";

after(() => db.$disconnect());

test("API create, query, edit, approve and edit published event preserve calendar date and time", async () => {
  const user = await actor("USER"), admin = await actor();
  for (const day of ["2026-09-19", "2026-09-06", "2026-04-05"]) {
    const form = new FormData();
    const data = requestData(user.id);
    for (const [key, value] of Object.entries(data)) if (key !== "userId") form.set(key, String(value));
    form.set("tentativeDate", day);
    form.set("ticketTypes", JSON.stringify([{ name: "General", price: 10000, stock: 50 }]));
    let res = await api("/api/event-requests", user, "POST", form);
    assert.equal(res.status, 200, await res.clone().text());
    const request = (await res.json()).eventRequest;
    assert.equal(calendarDate(request.tentativeDate), day);
    assert.equal(calendarDate((await db.eventRequest.findUnique({ where: { id: request.id } })).tentativeDate), day);
    res = await api(`/api/admin/event-requests/${request.id}`, admin);
    const queried = (await res.json()).request;
    res = await api(`/api/admin/event-requests/${request.id}`, admin, "PUT", { ...queried, tentativeDate: day });
    assert.equal(res.status, 200, await res.clone().text());
    res = await api(`/api/admin/event-requests/${request.id}/approve`, admin, "POST");
    assert.equal(res.status, 200, await res.clone().text());
    const event = (await res.json()).event;
    assert.equal(calendarDate(event.date), day);
    assert.equal(event.eventTime, "23:39");
    res = await api(`/api/admin/events/${event.id}`, admin, "PUT", { ...event, category: "Concierto", date: day });
    assert.equal(res.status, 200, await res.clone().text());
    for (const path of [`/api/events/${event.id}`, `/api/my-events/${event.id}`]) {
      const displayed = (await (await api(path, user)).json()).event;
      assert.equal(calendarDate(displayed.date), day);
      assert.equal(displayed.eventTime, "23:39");
    }
    assert.equal((await api(`/api/admin/events/${event.id}`, admin, "DELETE")).status, 200);
  }
});

test("API rejects impossible calendar dates with 400", async () => {
  const admin = await actor();
  const { event } = await fixture(admin);
  const res = await api(`/api/admin/events/${event.id}`, admin, "PUT", { title: event.title, category: "Concierto", date: "2026-02-29" });
  assert.equal(res.status, 400);
  assert.equal(calendarDate((await db.event.findUnique({ where: { id: event.id } })).date), "2026-09-19");
});

test("direct HTTP DELETE rejects anonymous, user and organizer for both endpoints", async () => {
  const admin = await actor();
  const { event, request } = await fixture(admin);
  for (const user of [null, await actor("USER"), await actor("ORGANIZER")]) {
    for (const path of [`/api/admin/events/${event.id}`, `/api/admin/event-requests/${request.id}`]) assert.equal((await api(path, user, "DELETE")).status, 403);
  }
  assert.ok(await db.event.findUnique({ where: { id: event.id } }));
});

test("admin deletes unsold event, its request, ticket types and carts; every query stops returning it", async () => {
  const admin = await actor();
  const { event, request, ticketType } = await fixture(admin, { featured: true, date: "2027-09-19" });
  await db.cartItem.create({ data: { eventId: event.id, userId: admin.id, ticketTypeId: ticketType.id, price: 10000, quantity: 1, attendeeName: "Test", attendeeDocumentType: "RUT", attendeeDocumentNumber: "11111111-1" } });
  assert.equal((await api(`/api/admin/events/${event.id}`, admin, "DELETE")).status, 200);
  for (const [model, where] of [["event", { id: event.id }], ["eventRequest", { id: request.id }], ["ticketType", { eventId: event.id }], ["cartItem", { eventId: event.id }], ["eventRequestTicketType", { eventRequestId: request.id }]]) assert.equal(await db[model].count({ where }), 0);
  for (const path of ["/api/events", "/api/my-events", "/api/admin/event-requests", "/api/admin/destacados", "/api/cart"]) {
    const res = await api(path, admin);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(text.includes(event.id), false, path);
    assert.equal(text.includes(request.id), false, path);
  }
  assert.equal((await api(`/api/events/${event.id}`)).status, 404);
  assert.equal((await api(`/api/admin/events/${event.id}`, admin, "DELETE")).status, 404);
});

test("pending and rejected requests and standalone events can be deleted", async () => {
  const admin = await actor();
  for (const status of ["PENDING", "REJECTED"]) {
    const request = await db.eventRequest.create({ data: { ...requestData(admin.id), status, ticketRequests: { create: { name: "General", price: 10000, stock: 5 } } } });
    assert.equal((await api(`/api/admin/event-requests/${request.id}`, admin, "DELETE")).status, 200);
    assert.equal(await db.eventRequestTicketType.count({ where: { eventRequestId: request.id } }), 0);
  }
  const { event } = await fixture(admin, { linked: false });
  assert.equal((await api(`/api/admin/events/${event.id}`, admin, "DELETE")).status, 200);
});

for (const status of ["PENDING", "PAID", "FAILED", "CANCELLED"]) {
  test(`orders with status ${status} block both DELETE endpoints and remain intact`, async () => {
    const admin = await actor();
    const { event, request, ticketType } = await fixture(admin);
    const order = await db.order.create({ data: orderData(event, ticketType, status) });
    for (const path of [`/api/admin/events/${event.id}`, `/api/admin/event-requests/${request.id}`]) {
      const res = await api(path, admin, "DELETE");
      assert.equal(res.status, 409);
      assert.match((await res.json()).error, /órdenes, pagos o tickets/);
    }
    assert.ok(await db.event.findUnique({ where: { id: event.id } }));
    assert.equal(await db.orderItem.count({ where: { orderId: order.id } }), 1);
    assert.equal((await db.order.findUnique({ where: { id: order.id } })).status, status);
    await assert.rejects(db.event.delete({ where: { id: event.id } }), { code: "P2003" });
    await assert.rejects(db.ticketType.delete({ where: { id: ticketType.id } }), { code: "P2003" });
  });
}

test("issued ticket without order items still blocks deletion and preserves QR", async () => {
  const admin = await actor();
  const { event, ticketType } = await fixture(admin);
  const order = await db.order.create({ data: { buyOrder: randomUUID(), amount: 10000, status: "PAID", authorizationCode: "test-payment" } });
  const ticket = await db.ticket.create({ data: { code: randomUUID(), qrToken: randomUUID(), eventId: event.id, ticketTypeId: ticketType.id, orderId: order.id, attendeeName: "Test", attendeeDocumentType: "RUT", attendeeDocumentNumber: "11111111-1", pricePaid: 10000 } });
  assert.equal((await api(`/api/admin/events/${event.id}`, admin, "DELETE")).status, 409);
  assert.equal((await db.ticket.findUnique({ where: { id: ticket.id } })).qrToken, ticket.qrToken);
});

test("an uncommitted checkout blocks deletion, then its committed order is detected", async () => {
  const admin = await actor();
  const { event, ticketType } = await fixture(admin);
  let release, inserted;
  const ready = new Promise((resolve) => { inserted = resolve; });
  const hold = new Promise((resolve) => { release = resolve; });
  const purchase = db.$transaction(async (tx) => {
    await tx.order.create({ data: orderData(event, ticketType) });
    inserted();
    await hold;
  }, { timeout: 10000 });
  await ready;
  let finished = false;
  const deletion = deleteEvent(db, admin, event.id).then(() => { finished = true; return null; }, (error) => { finished = true; return error; });
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(finished, false);
  release();
  await purchase;
  assert.equal((await deletion).status, 409);
  assert.ok(await db.event.findUnique({ where: { id: event.id } }));
});

test("checkout starting after deletion locks cannot create an orphan order", async () => {
  const admin = await actor();
  const { event, ticketType } = await fixture(admin);
  let release, locked;
  const ready = new Promise((resolve) => { locked = resolve; });
  const hold = new Promise((resolve) => { release = resolve; });
  const deleting = db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${event.id} FOR UPDATE`;
    locked();
    await hold;
    await tx.ticketType.deleteMany({ where: { eventId: event.id } });
    await tx.event.delete({ where: { id: event.id } });
  }, { timeout: 10000 });
  await ready;
  const data = orderData(event, ticketType);
  const purchase = db.order.create({ data }).then(() => null, (error) => error);
  release();
  await deleting;
  assert.equal((await purchase).code, "P2003");
  assert.equal(await db.order.count({ where: { buyOrder: data.buyOrder } }), 0);
});

test("approval racing deletion leaves neither an orphan event nor a half-approved request", async () => {
  const admin = await actor();
  const request = await db.eventRequest.create({ data: { ...requestData(admin.id), ticketRequests: { create: { name: "General", price: 10000, stock: 5 } } } });
  const [approval, deletion] = await Promise.all([
    api(`/api/admin/event-requests/${request.id}/approve`, admin, "POST"),
    api(`/api/admin/event-requests/${request.id}`, admin, "DELETE"),
  ]);
  assert.ok([200, 404].includes(approval.status));
  assert.equal(deletion.status, 200);
  assert.equal(await db.eventRequest.count({ where: { id: request.id } }), 0);
  assert.equal(await db.event.count({ where: { sourceRequestId: request.id } }), 0);
});
