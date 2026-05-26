import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTicketRequests(ticketRequests = []) {
  return ticketRequests.map((ticket) => {
    const unlimitedStock = Boolean(ticket.unlimitedStock);
    const parsedPrice = Number(ticket.price);
    const parsedStock = unlimitedStock ? null : Number(ticket.stock);

    return {
      id:
        ticket.id && !String(ticket.id).startsWith("tmp-")
          ? String(ticket.id)
          : null,
      name: normalizeText(ticket.name),
      description: normalizeNullableText(ticket.description),
      price: parsedPrice,
      stock: parsedStock,
      unlimitedStock,
    };
  });
}

export async function GET(request, context) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await context.params;

    const eventRequest = await prisma.eventRequest.findUnique({
      where: { id },
      include: {
        ticketRequests: {
          orderBy: { createdAt: "asc" },
        },
        event: {
          include: {
            category: true,
            ticketTypes: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!eventRequest) {
      return NextResponse.json(
        { error: "Solicitud no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: eventRequest });
  } catch (error) {
    console.error("GET_ADMIN_EVENT_REQUEST_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo cargar la solicitud." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const existingRequest = await prisma.eventRequest.findUnique({
      where: { id },
      include: {
        ticketRequests: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Solicitud no encontrada." },
        { status: 404 }
      );
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "Solo puedes editar solicitudes pendientes. Las aprobadas se editan como evento publicado.",
        },
        { status: 400 }
      );
    }

    const normalizedTicketTypes = normalizeTicketRequests(
      body.ticketRequests || []
    );

    if (!normalizedTicketTypes.length) {
      return NextResponse.json(
        { error: "Debes dejar al menos un tipo de entrada." },
        { status: 400 }
      );
    }

    const invalidTicket = normalizedTicketTypes.find(
      (ticket) =>
        !ticket.name ||
        !Number.isFinite(ticket.price) ||
        ticket.price <= 0 ||
        (!ticket.unlimitedStock &&
          (!Number.isFinite(ticket.stock) || ticket.stock <= 0))
    );

    if (invalidTicket) {
      return NextResponse.json(
        {
          error:
            "Cada tipo de entrada debe tener nombre, precio válido y stock válido, salvo que use stock ilimitado.",
        },
        { status: 400 }
      );
    }

    const minAge = normalizeNumber(body.minAge);
    const eventTime = normalizeText(body.eventTime);

    if (minAge === null || minAge < 0) {
      return NextResponse.json(
        { error: "La edad mínima no es válida." },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(eventTime)) {
      return NextResponse.json(
        { error: "La hora del evento no es válida." },
        { status: 400 }
      );
    }

    const normalizedDate = normalizeText(body.tentativeDate);

    if (!normalizedDate) {
      return NextResponse.json(
        { error: "La fecha tentativa es obligatoria." },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.eventRequest.update({
      where: { id },
      data: {
        firstName: normalizeText(body.firstName),
        lastName: normalizeText(body.lastName),
        company: normalizeText(body.company),
        email: normalizeText(body.email).toLowerCase(),
        phone: normalizeText(body.phone),
        eventName: normalizeText(body.eventName),
        category: normalizeText(body.category),
        tentativeDate: new Date(`${normalizedDate}T00:00:00`),

        minAge,
        eventTime,

        region: normalizeNullableText(body.region),
        city: normalizeText(body.city),
        venue: normalizeText(body.venue),
        address: normalizeNullableText(body.address),
        message: normalizeText(body.message),

        ticketRequests: {
          deleteMany: {},
          create: normalizedTicketTypes.map((ticket) => ({
            name: ticket.name,
            description: ticket.description,
            price: ticket.price,
            stock: ticket.unlimitedStock ? null : ticket.stock,
            unlimitedStock: ticket.unlimitedStock,
          })),
        },
      },
      include: {
        ticketRequests: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("UPDATE_EVENT_REQUEST_ERROR:", error);

    return NextResponse.json(
      {
        error: "No se pudo actualizar la solicitud.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}