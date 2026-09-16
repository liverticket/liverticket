export class EventDeletionError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function deleteEvent(db, admin, id, kind = "event") {
  if (admin?.role !== "ADMIN") throw new EventDeletionError("No autorizado.", 403);
  return db.$transaction(async (tx) => {
    let event;
    let requestId;
    if (kind === "request") {
      requestId = id;
    } else {
      event = await tx.event.findUnique({ where: { id } });
      if (!event) throw new EventDeletionError("Evento no encontrado.", 404);
      requestId = event.sourceRequestId;
    }

    // Same lock order as approval: request, then event. Locking the parent
    // also serializes concurrent inserts through PostgreSQL foreign keys.
    if (requestId) {
      const rows = await tx.$queryRaw`SELECT "id" FROM "EventRequest" WHERE "id" = ${requestId} FOR UPDATE`;
      if (!rows.length) throw new EventDeletionError("Solicitud no encontrada.", 404);
    }
    if (kind === "request") {
      event = await tx.event.findUnique({ where: { sourceRequestId: id } });
    }
    if (event) {
      const rows = await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${event.id} FOR UPDATE`;
      if (!rows.length) throw new EventDeletionError("Evento no encontrado.", 404);
      await tx.$queryRaw`SELECT "id" FROM "TicketType" WHERE "eventId" = ${event.id} ORDER BY "id" FOR UPDATE`;
      const related = { OR: [{ eventId: event.id }, { ticketType: { eventId: event.id } }] };
      const orders = await tx.orderItem.count({ where: related });
      const tickets = await tx.ticket.count({ where: related });
      if (orders || tickets) {
        throw new EventDeletionError(
          "No se puede eliminar el evento porque tiene órdenes, pagos o tickets asociados, incluidas compras pendientes o canceladas.", 409,
        );
      }
      await tx.cartItem.deleteMany({ where: related });
      await tx.ticketType.deleteMany({ where: { eventId: event.id } });
      await tx.event.delete({ where: { id: event.id } });
    }
    if (requestId) {
      await tx.eventRequestTicketType.deleteMany({ where: { eventRequestId: requestId } });
      await tx.eventRequest.delete({ where: { id: requestId } });
    }
    // URLs are not proof of ownership. Keep Cloudinary assets: they may be
    // shared or referenced outside this database; there is no asset registry.
    return { eventId: event?.id || null, requestId: requestId || null };
  }, { isolationLevel: "ReadCommitted", timeout: 10000 });
}

export function createDeleteHandler({ db, getAdmin, invalidate = () => {} }, kind) {
  return async function DELETE(_request, context) {
    try {
      const admin = await getAdmin();
      if (admin?.role !== "ADMIN") return Response.json({ error: "No autorizado." }, { status: 403 });
      const { id } = await context.params;
      const deleted = await deleteEvent(db, admin, id, kind);
      // A cache failure must not report that an already committed deletion failed.
      try { await invalidate(deleted); } catch (error) { console.error("EVENT_CACHE_INVALIDATION_ERROR", error); }
      return Response.json({ ok: true, ...deleted });
    } catch (error) {
      if (error instanceof EventDeletionError) return Response.json({ error: error.message }, { status: error.status });
      if (["P2003", "P2014", "P2034", "P2028"].includes(error.code)) {
        return Response.json({ error: "El evento tiene registros asociados o una operación en curso. No se eliminó; vuelve a consultar antes de intentarlo." }, { status: 409 });
      }
      console.error("DELETE_EVENT_ERROR", error);
      return Response.json({ error: "No se pudo eliminar el evento. Inténtalo nuevamente." }, { status: 500 });
    }
  };
}
