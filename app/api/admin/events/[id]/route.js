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

function normalizeTicketTypes(ticketTypes = []) {
  return ticketTypes.map((ticket) => {
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

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        ticketTypes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("GET event error:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el evento." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        ticketTypes: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Evento no encontrado." },
        { status: 404 }
      );
    }

    const normalizedTitle = normalizeText(body.title);
    const normalizedCategory = normalizeText(body.category);
    const normalizedDate = normalizeText(body.date);
    const eventTime = normalizeText(body.eventTime);
    const minAge = normalizeNumber(body.minAge);

    if (!normalizedTitle) {
      return NextResponse.json(
        { error: "El título es obligatorio." },
        { status: 400 }
      );
    }

    if (!normalizedCategory) {
      return NextResponse.json(
        { error: "La categoría es obligatoria." },
        { status: 400 }
      );
    }

    if (!normalizedDate) {
      return NextResponse.json(
        { error: "La fecha es obligatoria." },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(eventTime)) {
      return NextResponse.json(
        { error: "La hora del evento no es válida." },
        { status: 400 }
      );
    }

    if (minAge === null || minAge < 0) {
      return NextResponse.json(
        { error: "La edad mínima no es válida." },
        { status: 400 }
      );
    }

    const normalizedTicketTypes = normalizeTicketTypes(body.ticketTypes || []);

    const ticketTypesToProcess = normalizedTicketTypes.length
      ? normalizedTicketTypes
      : existingEvent.ticketTypes.map((ticket) => ({
          id: ticket.id,
          name: ticket.name,
          description: ticket.description,
          price: ticket.price,
          stock: ticket.stock,
          unlimitedStock: ticket.unlimitedStock,
        }));

    if (!ticketTypesToProcess.length) {
      return NextResponse.json(
        { error: "Debes dejar al menos un tipo de entrada." },
        { status: 400 }
      );
    }

    const invalidTicket = ticketTypesToProcess.find(
      (ticket) =>
        !ticket.name ||
        !Number.isFinite(Number(ticket.price)) ||
        Number(ticket.price) <= 0 ||
        (!ticket.unlimitedStock &&
          (!Number.isFinite(Number(ticket.stock)) || Number(ticket.stock) <= 0))
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

    const categoryRecord = await prisma.category.upsert({
      where: { name: normalizedCategory },
      update: {},
      create: { name: normalizedCategory },
    });

    const existingTicketTypeIds = existingEvent.ticketTypes.map(
      (ticket) => ticket.id
    );

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          title: normalizedTitle,
          description: normalizeNullableText(body.description),
          imageUrl: normalizeNullableText(body.imageUrl),
          venue: normalizeNullableText(body.venue),
          city: normalizeNullableText(body.city),
          region: normalizeNullableText(body.region),
          address: normalizeNullableText(body.address),
          location:
            normalizeNullableText(body.venue) ||
            normalizeNullableText(body.address) ||
            normalizeNullableText(body.city) ||
            "Lugar por definir",
          date: new Date(`${normalizedDate}T12:00:00`),
          minAge,
          eventTime,
          categoryId: categoryRecord.id,
        },
      });

      for (const ticket of ticketTypesToProcess) {
        if (ticket.id && existingTicketTypeIds.includes(ticket.id)) {
          await tx.ticketType.update({
            where: { id: ticket.id },
            data: {
              name: ticket.name,
              description: ticket.description,
              price: Number(ticket.price),
              stock: ticket.unlimitedStock ? null : Number(ticket.stock),
              unlimitedStock: Boolean(ticket.unlimitedStock),
            },
          });
        } else {
          await tx.ticketType.create({
            data: {
              eventId: id,
              name: ticket.name,
              description: ticket.description,
              price: Number(ticket.price),
              stock: ticket.unlimitedStock ? null : Number(ticket.stock),
              unlimitedStock: Boolean(ticket.unlimitedStock),
            },
          });
        }
      }
    });

    const updatedEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        ticketTypes: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("UPDATE EVENT ERROR:", error);

    return NextResponse.json(
      {
        error: "No se pudo actualizar el evento.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}