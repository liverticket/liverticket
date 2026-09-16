import test from "node:test";
import assert from "node:assert/strict";
import { createDeleteHandler, deleteEvent } from "../lib/delete-event.mjs";

for (const kind of ["event", "request"]) {
  for (const role of [null, "USER", "ORGANIZER"]) {
    test(`DELETE ${kind} denies ${role || "anonymous"} before querying database`, async () => {
      const db = { $transaction() { throw new Error("Database must not be called"); } };
      const handler = createDeleteHandler({ db, getAdmin: async () => role ? { role } : null }, kind);
      const response = await handler(new Request("http://localhost/test", { method: "DELETE" }), { params: Promise.resolve({ id: "event" }) });
      assert.equal(response.status, 403);
      await assert.rejects(deleteEvent(db, role ? { role } : null, "event", kind), { status: 403 });
    });
  }
}

test("transaction errors are reported without claiming success", async () => {
  const handler = createDeleteHandler({ db: { $transaction() { throw { code: "P2034" }; } }, getAdmin: async () => ({ role: "ADMIN" }) }, "event");
  const response = await handler(null, { params: { id: "event" } });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /operación en curso/);
});
