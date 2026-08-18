import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function toPublicTicketType(ticketType) {
  return {
    id: ticketType.id,
    name: ticketType.name,
    description: ticketType.description,
    price: ticketType.price,
    unlimitedStock: ticketType.unlimitedStock,
    soldOut:
      !ticketType.unlimitedStock && Number(ticketType.stock || 0) <= 0,
  };
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        visibility: "PUBLISHED",
      },
      include: {
        category: true,
        ticketTypes: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            unlimitedStock: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({
      events: events.map((event) => ({
        ...event,
        ticketTypes: event.ticketTypes.map(toPublicTicketType),
      })),
    });
  } catch (error) {
    console.error("GET events error:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los eventos." },
      { status: 500 }
    );
  }
}
