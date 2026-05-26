import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        userId: user.id,
      },
      include: {
        event: true,
        ticketType: true,
        order: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET_MY_TICKETS_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar tus tickets." },
      { status: 500 }
    );
  }
}