import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { qrToken } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: {
        qrToken,
      },
      include: {
        event: true,
        ticketType: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          valid: false,
          title: "Entrada no encontrada",
          message: "El código QR no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: ticket.status === "VALID",
      ticket,
    });
  } catch (error) {
    console.error("TICKET_VALIDATE_ERROR:", error);

    return NextResponse.json(
      {
        valid: false,
        title: "Error",
        message: "No se pudo validar la entrada.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}