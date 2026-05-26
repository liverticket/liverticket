import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request, context) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await context.params;

    const eventRequest = await prisma.eventRequest.findUnique({
      where: { id },
      include: {
        ticketRequests: true,
      },
    });

    if (!eventRequest) {
      return NextResponse.json(
        { error: "Solicitud no encontrada." },
        { status: 404 }
      );
    }

    if (eventRequest.status === "APPROVED") {
      return NextResponse.json(
        { error: "La solicitud ya fue aprobada." },
        { status: 400 }
      );
    }

    if (eventRequest.status === "REJECTED") {
      return NextResponse.json(
        { error: "La solicitud ya fue rechazada." },
        { status: 400 }
      );
    }

    const existingEvent = await prisma.event.findUnique({
      where: { sourceRequestId: eventRequest.id },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: "Ya existe un evento creado para esta solicitud." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(eventRequest.ticketRequests) ||
      eventRequest.ticketRequests.length === 0
    ) {
      return NextResponse.json(
        { error: "La solicitud no tiene tipos de entrada configurados." },
        { status: 400 }
      );
    }

    const invalidTicket = eventRequest.ticketRequests.find(
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
            "La solicitud contiene tipos de entrada inválidos. Revisa nombre, precio y stock.",
        },
        { status: 400 }
      );
    }

    const categoryName = String(eventRequest.category || "").trim();

    const categoryRecord = categoryName
      ? await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        })
      : null;

    const createdEvent = await prisma.event.create({
      data: {
        title: eventRequest.eventName,
        description: eventRequest.message,
        imageUrl: eventRequest.flyerUrl,

        location:
          eventRequest.venue ||
          eventRequest.address ||
          eventRequest.city ||
          "Lugar por definir",
        venue: eventRequest.venue || null,
        city: eventRequest.city || null,
        region: eventRequest.region || null,
        address: eventRequest.address || null,

        minAge: eventRequest.minAge,
        eventTime: eventRequest.eventTime,

        date: eventRequest.tentativeDate,
        visibility: "PUBLISHED",
        organizerId: eventRequest.userId,
        sourceRequestId: eventRequest.id,
        categoryId: categoryRecord?.id || null,

        ticketTypes: {
          create: eventRequest.ticketRequests.map((ticket) => ({
            name: ticket.name,
            description: ticket.description || null,
            price: ticket.price,
            stock: ticket.unlimitedStock ? null : ticket.stock,
            unlimitedStock: ticket.unlimitedStock,
          })),
        },
      },
      include: {
        category: true,
        ticketTypes: true,
      },
    });

    await prisma.eventRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
      },
    });

    return NextResponse.json({
      ok: true,
      event: createdEvent,
    });
  } catch (error) {
    console.error("APPROVE_EVENT_REQUEST_ERROR:", error);

    return NextResponse.json(
      {
        error: "No se pudo aprobar la solicitud.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}