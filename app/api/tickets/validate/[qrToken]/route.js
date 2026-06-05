import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: {
        qrToken: params.qrToken,
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
    console.error(error);

    return NextResponse.json(
      {
        valid: false,
        title: "Error",
        message: "No se pudo validar la entrada.",
      },
      { status: 500 }
    );
  }
}