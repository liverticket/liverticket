import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const url = process.env.TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith("/liverticket_test")) {
  throw new Error("TEST_DATABASE_URL must point to the isolated local liverticket_test database.");
}
export const db = new PrismaClient({ datasources: { db: { url } } });
export const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3107";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Tests only support a local API.");

export async function actor(role = "ADMIN") {
  const user = await db.user.create({ data: { name: "Prueba local", email: `${randomUUID()}@example.test`, password: "unused-test-password", role } });
  const token = randomUUID();
  await db.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) } });
  return { ...user, token };
}

export function requestData(userId, overrides = {}) {
  return { userId, firstName: "Prueba", lastName: "Local", company: "Productora de prueba", email: "test@example.test", phone: "56911111111", eventName: `Evento prueba ${randomUUID()}`, category: "Concierto", tentativeDate: new Date("2026-09-19T00:00:00Z"), minAge: 18, eventTime: "23:39", region: "Maule", city: "Talca", venue: "Teatro de prueba", address: "Calle prueba 123", message: "Evento ficticio para validación local", flyerUrl: "/images/liverticket-logo.png", ...overrides };
}

export async function fixture(owner, { linked = true, featured = false, date = "2026-09-19" } = {}) {
  const request = linked ? await db.eventRequest.create({ data: { ...requestData(owner.id), status: "APPROVED", ticketRequests: { create: { name: "General", price: 10000, stock: 50 } } } }) : null;
  const event = await db.event.create({ data: { title: request?.eventName || `Evento ${randomUUID()}`, organizerId: owner.id, date: new Date(`${date}T00:00:00Z`), eventTime: "23:39", minAge: 18, location: "Teatro de prueba", city: "Talca", imageUrl: "/images/liverticket-logo.png", sourceRequestId: request?.id, isFeatured: featured, ticketTypes: { create: { name: "General", price: 10000, stock: 50 } } }, include: { ticketTypes: true } });
  return { event, request, ticketType: event.ticketTypes[0] };
}

export function orderData(event, ticketType, status = "PENDING") {
  return { buyOrder: randomUUID(), amount: 10000, status, items: { create: { eventId: event.id, ticketTypeId: ticketType.id, quantity: 1, unitPrice: 10000, totalPrice: 10000, attendeeName: "Prueba local", attendeeDocumentType: "RUT", attendeeDocumentNumber: "11111111-1" } } };
}

export async function api(path, user, method = "GET", body) {
  const headers = user ? { Cookie: `liverticket_session=${user.token}` } : {};
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(`${baseURL}${path}`, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
}
