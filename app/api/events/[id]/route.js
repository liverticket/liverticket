import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const event = await prisma.event.findFirst({
      where: {
        id,
        visibility: "PUBLISHED",
      },
      include: {
        category: true,
        ticketTypes: {
          orderBy: {
            price: "asc",
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

    return NextResponse.json({ event });
  } catch (error) {
    console.error("GET event error:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el evento." },
      { status: 500 }
    );
  }
}