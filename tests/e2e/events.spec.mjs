import { test, expect } from "@playwright/test";
import { actor, fixture, db, baseURL, requestData, orderData } from "../integration/helpers.mjs";

test.afterAll(() => db.$disconnect());

async function login(context, user) {
  await context.addCookies([{ name: "liverticket_session", value: user.token, url: baseURL }]);
}

test("date, edit input, cancellation, single deletion and immediate list update", async ({ page, context }, info) => {
  const admin = await actor();
  await login(context, admin);
  const request = await db.eventRequest.create({ data: { ...requestData(admin.id), eventName: `Validación fecha ${info.project.name}`, ticketRequests: { create: { name: "General", price: 10000, stock: 50 } } } });
  await page.goto("/admin/solicitudes");
  const card = page.locator(".ticketCard").filter({ hasText: request.eventName });
  await expect(card).toContainText("19-09-2026");
  await expect(card).toContainText("23:39 hrs.");
  await card.getByRole("button", { name: "Editar solicitud", exact: true }).click();
  await expect(card.locator('input[type="date"]')).toHaveValue("2026-09-19");
  await card.getByRole("button", { name: "Cancelar", exact: true }).click();
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: `.test-runtime/admin-${info.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const button = card.getByRole("button", { name: "Eliminar evento", exact: true });
  page.once("dialog", (dialog) => { expect(dialog.message()).toContain(request.eventName); return dialog.dismiss(); });
  await button.click();
  await expect(card).toBeVisible();
  expect(await db.eventRequest.count({ where: { id: request.id } })).toBe(1);
  let deletes = 0;
  let releaseDelete;
  const held = new Promise((resolve) => { releaseDelete = resolve; });
  await page.route(`**/api/admin/event-requests/${request.id}`, async (route) => {
    if (route.request().method() === "DELETE") { deletes++; await held; }
    await route.continue();
  });
  page.once("dialog", (dialog) => dialog.accept());
  await button.click();
  await expect(card.getByRole("button", { name: "Eliminando...", exact: true })).toBeDisabled();
  await card.locator(".btnDeleteEvent").evaluate((element) => { element.click(); element.click(); });
  releaseDelete();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("se eliminó correctamente");
  expect(deletes).toBe(1);
  expect(await db.eventRequest.count({ where: { id: request.id } })).toBe(0);
});

test("event with paid order stays visible with understandable error", async ({ page, context }, info) => {
  const admin = await actor();
  const { event, ticketType } = await fixture(admin);
  await db.order.create({ data: orderData(event, ticketType, "PAID") });
  await login(context, admin);
  await page.goto("/admin/solicitudes");
  const card = page.locator(".ticketCard").filter({ hasText: event.title });
  await card.getByText(event.title, { exact: true }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Eliminar evento", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("órdenes, pagos o tickets");
  await expect(card).toBeVisible();
  await card.screenshot({ path: `.test-runtime/blocked-${info.project.name}.png` });
});

test("featured list removal and public detail disappear", async ({ page, context }) => {
  const admin = await actor();
  const { event } = await fixture(admin, { featured: true, date: "2027-09-19" });
  await login(context, admin);
  await page.goto("/admin/destacados");
  const card = page.locator(".ticketCard").filter({ hasText: event.title });
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Eliminar evento", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto(`/evento/${event.id}`);
  await expect(page.getByText(/no encontrado/i)).toBeVisible();
});

test("anonymous visitor has no deletion controls", async ({ page }) => {
  await page.goto("/admin/solicitudes");
  await expect(page.getByRole("button", { name: "Eliminar evento" })).toHaveCount(0);
  await page.goto("/admin/destacados");
  await expect(page.getByRole("button", { name: "Eliminar evento" })).toHaveCount(0);
});
