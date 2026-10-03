import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: "No autorizado." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").trim().slice(0, 150);
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.get("page"), 10) || 1));
  const contains = { contains: query, mode: "insensitive" };
  const where = query ? { OR: [{ attendeeName: contains }, { code: contains }, { orderId: contains }, { event: { title: contains } }, { order: { buyerEmail: contains } }, { order: { buyOrder: contains } }, { order: { user: { email: contains } } }] } : {};
  try {
    const [total, tickets] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({ where, skip: (page - 1) * 50, take: 50, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: {
        id: true, code: true, status: true, attendeeName: true, createdAt: true, orderId: true,
        event: { select: { title: true } }, ticketType: { select: { name: true } },
        order: { select: { buyOrder: true, buyerEmail: true, status: true, userId: true, user: { select: { email: true } } } },
      } }),
    ]);
    return Response.json({ tickets, total, page, pages: Math.max(1, Math.ceil(total / 50)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ADMIN_TICKETS_ERROR", error.code || error.name);
    return Response.json({ error: "No se pudieron cargar las entradas." }, { status: 500 });
  }
}
