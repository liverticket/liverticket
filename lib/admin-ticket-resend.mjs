export function createTicketResendHandler({ db, getAdmin, sendEmail }) {
  return async function POST(request) {
    const admin = await getAdmin();
    if (admin?.role !== "ADMIN") return Response.json({ error: "No autorizado." }, { status: 403 });
    let body;
    try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
    const to = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const ids = body?.ticketIds;
    if (!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(to) || to.length > 254 || !Array.isArray(ids) || !ids.length || ids.length > 50 || ids.some(id => typeof id !== "string" || !id || id.length > 100) || new Set(ids).size !== ids.length) {
      return Response.json({ error: "Indica un correo válido y selecciona entre 1 y 50 entradas distintas." }, { status: 400 });
    }
    try {
      const tickets = await db.ticket.findMany({ where: { id: { in: ids } }, include: { event: true, ticketType: true, order: true } });
      if (tickets.length !== ids.length || tickets.some(t => t.status !== "VALID" || t.order.status !== "PAID")) {
        return Response.json({ error: "Solo puedes reenviar entradas válidas de compras pagadas. Actualiza la lista." }, { status: 409 });
      }
      const result = await sendEmail({ to, order: tickets[0].order, tickets });
      if (!result?.accepted?.some(email => email.toLowerCase() === to) || result?.rejected?.length) {
        return Response.json({ error: "El servidor de correo no aceptó el destinatario." }, { status: 502 });
      }
      return Response.json({ message: `Se enviaron ${tickets.length} entradas a ${to}.`, count: tickets.length });
    } catch (error) {
      console.error("ADMIN_TICKET_RESEND_ERROR", error.code || error.name);
      return Response.json({ error: "No se pudo confirmar el envío. Revisa el servicio de correo antes de volver a intentarlo." }, { status: 502 });
    }
  };
}
