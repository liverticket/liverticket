import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const requests = await prisma.eventRequest.findMany({
      where: {
        userId: user.id,
      },
      include: {
        event: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const events = await prisma.event.findMany({
      where: {
        organizerId: user.id,
      },
      include: {
        tickets: {
          select: {
            id: true,
            pricePaid: true,
            status: true,
          },
        },
        ticketTypes: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const normalizedRequests = requests.map((request) => ({
      id: request.id,
      eventId: request.event?.id || null,
      eventName: request.eventName,
      category: request.category,
      tentativeDate: request.tentativeDate,
      eventTime: request.eventTime,
      minAge: request.minAge,
      city: request.city,
      region: request.region,
      venue: request.venue,
      address: request.address,
      flyerUrl: request.flyerUrl,
      status: request.status,
      createdAt: request.createdAt,
    }));

    const normalizedEvents = events.map((event) => {
      const validTickets = event.tickets.filter(
        (ticket) => ticket.status !== "CANCELLED"
      );

      const totalSales = validTickets.reduce((sum, ticket) => {
        return sum + (ticket.pricePaid || 0);
      }, 0);

      return {
        id: event.id,
        title: event.title,
        imageUrl: event.imageUrl,
        date: event.date,
        eventTime: event.eventTime,
        venue: event.venue,
        location: event.location,
        city: event.city,
        region: event.region,
        visibility: event.visibility,
        soldTickets: validTickets.length,
        totalSales,
      };
    });

    return NextResponse.json({
      requests: normalizedRequests,
      events: normalizedEvents,
      hasMyEvents:
        normalizedRequests.length > 0 || normalizedEvents.length > 0,
    });
  } catch (error) {
    console.error("Error cargando Mis Eventos:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar tus eventos" },
      { status: 500 }
    );
  }
}