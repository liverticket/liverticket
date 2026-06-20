import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function generateScannerCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const requests = await prisma.eventRequest.findMany({
      where: {
        userId: user.id,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            date: true,
            eventTime: true,
            venue: true,
            location: true,
            city: true,
            region: true,
            minAge: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const eventsWithoutScannerCode = await prisma.event.findMany({
      where: {
        organizerId: user.id,
        scannerCode: null,
      },
      select: {
        id: true,
      },
    });

    if (eventsWithoutScannerCode.length > 0) {
      await Promise.all(
        eventsWithoutScannerCode.map((event) =>
          prisma.event.update({
            where: { id: event.id },
            data: {
              scannerCode: generateScannerCode(),
            },
          })
        )
      );
    }

    const events = await prisma.event.findMany({
      where: {
        organizerId: user.id,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
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
      eventName: request.event?.title || request.eventName,
      category: request.event?.category?.name || request.category,
      tentativeDate: request.event?.date || request.tentativeDate,
      eventTime: request.event?.eventTime || request.eventTime,
      minAge: request.event?.minAge ?? request.minAge,
      city: request.event?.city || request.city,
      region: request.event?.region || request.region,
      venue: request.event?.venue || request.venue,
      address: request.address,
      flyerUrl: request.event?.imageUrl || request.flyerUrl,
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
        category: event.category?.name || null,
        minAge: event.minAge,
        visibility: event.visibility,
        soldTickets: validTickets.length,
        totalSales,
        scannerCode: event.scannerCode,
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