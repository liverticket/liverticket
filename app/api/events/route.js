import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        visibility: "PUBLISHED",
      },
      include: {
        category: true,
        ticketTypes: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET events error:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los eventos." },
      { status: 500 }
    );
  }
}