import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        organizerId: user.id,
      },
      include: {
        ticketTypes: true,
        tickets: {
          include: {
            ticketType: true,
            order: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const eventEndLimit = new Date(event.date);
    eventEndLimit.setDate(eventEndLimit.getDate() + 7);

    const canViewAttendees = new Date() <= eventEndLimit;

    const validTickets = event.tickets.filter(
      (ticket) => ticket.status !== "CANCELLED"
    );

    const soldTickets = validTickets.length;

    const totalSales = validTickets.reduce((sum, ticket) => {
      return sum + (ticket.pricePaid || 0);
    }, 0);

    const attendees = canViewAttendees
      ? validTickets.map((ticket) => ({
          id: ticket.id,
          attendeeName: ticket.attendeeName,
          attendeeDocumentType: ticket.attendeeDocumentType,
          attendeeDocumentNumber: ticket.attendeeDocumentNumber,
          ticketType: ticket.ticketType?.name || "Ticket",
          status: ticket.status,
          pricePaid: ticket.pricePaid || 0,
          createdAt: ticket.createdAt,
        }))
      : [];

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        date: event.date,
        eventTime: event.eventTime,
        venue: event.venue,
        location: event.location,
        city: event.city,
        region: event.region,
        minAge: event.minAge,
        visibility: event.visibility,
        soldTickets,
        totalSales,
        ticketTypes: event.ticketTypes,
        attendees,
        canViewAttendees,
        attendeesVisibleUntil: eventEndLimit,
      },
    });
  } catch (error) {
    console.error("Error cargando detalle Mis Eventos:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el evento" },
      { status: 500 }
    );
  }
}