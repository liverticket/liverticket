import test from "node:test";
import assert from "node:assert/strict";
import { createTicketResendHandler } from "../lib/admin-ticket-resend.mjs";
const request = (body = { email: "ilrojoc@gmail.com", ticketIds: ["a", "b"] }) => new Request("http://localhost/api/admin/tickets/resend", { method: "POST", body: JSON.stringify(body) });
const tickets = ["a", "b"].map(id => ({ id, status: "VALID", order: { status: "PAID", buyOrder: id } }));
function setup(options = {}) {
  const calls = [];
  const handler = createTicketResendHandler({ getAdmin: async () => ({ role: "ADMIN" }), db: { ticket: { findMany: async () => tickets } }, sendEmail: async data => { calls.push(data); return { accepted: [data.to], rejected: [] }; }, ...options });
  return { handler, calls };
}
for (const role of [null, "USER", "ORGANIZER"]) test(`resend blocks ${role} without DB or SMTP access`, async () => {
  const { handler, calls } = setup({ getAdmin: async () => role ? { role } : null, db: { ticket: { findMany: () => { throw new Error("Unexpected DB access"); } } } });
  assert.equal((await handler(request())).status, 403); assert.equal(calls.length, 0);
});
for (const body of [{ email: "a@gmail.com,b@gmail.com", ticketIds: ["a"] }, { email: "a@gmail.com", ticketIds: [] }, { email: "a@gmail.com", ticketIds: ["a", "a"] }, { email: "a@gmail.com", ticketIds: Array.from({ length: 51 }, (_, i) => String(i)) }, null]) test(`invalid resend ${JSON.stringify(body)}`, async () => {
  const { handler, calls } = setup(); assert.equal((await handler(request(body))).status, 400); assert.equal(calls.length, 0);
});
for (const rows of [tickets.slice(0, 1), [{ ...tickets[0], status: "USED" }, tickets[1]], [{ ...tickets[0], status: "CANCELLED" }, tickets[1]], [{ ...tickets[0], order: { status: "PENDING" } }, tickets[1]]]) test("rejects incomplete, used, cancelled or unpaid selection without sending", async () => {
  const { handler, calls } = setup({ db: { ticket: { findMany: async () => rows } } }); assert.equal((await handler(request())).status, 409); assert.equal(calls.length, 0);
});
test("sends only selected tickets in one message to normalized recipient, preserving each order", async () => {
  let filter;
  const { handler, calls } = setup({ db: { ticket: { findMany: async args => { filter = args.where; return tickets; } } } });
  const response = await handler(request({ email: " ILROJOC@gmail.com ", ticketIds: ["a", "b"] }));
  assert.equal(response.status, 200); assert.deepEqual(filter, { id: { in: ["a", "b"] } }); assert.equal(calls.length, 1); assert.equal(calls[0].to, "ilrojoc@gmail.com"); assert.deepEqual(calls[0].tickets, tickets); assert.equal((await response.json()).count, 2);
});
test("SMTP rejection never reports success", async () => {
  const { handler } = setup({ sendEmail: async () => ({ accepted: [], rejected: ["ilrojoc@gmail.com"] }) }); assert.equal((await handler(request())).status, 502);
});
test("SMTP failure never reports success", async () => {
  const { handler } = setup({ sendEmail: async () => { throw new Error("smtp"); } }); assert.equal((await handler(request())).status, 502);
});
