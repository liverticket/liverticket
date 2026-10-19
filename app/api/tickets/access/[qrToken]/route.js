import { NextResponse } from "next/server";
import { matchesScannerCode } from "@/lib/scanner-code.mjs";
import prisma from "@/lib/prisma";

export async function POST(request, { params }) {
  try {
    const { qrToken } = await params;
    const body = await request.json();
    const scannerCode = String(body.scannerCode || "").trim();

    if (!scannerCode) {
      return NextResponse.json(
        { success: false, message: "Debes ingresar el código de acceso." },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrToken },
      include: {
        event: true,
        ticketType: {
          select: { id: true, name: true, description: true, price: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Entrada no encontrada." },
        { status: 404 }
      );
    }

    if (!matchesScannerCode(ticket.event?.scannerCode, scannerCode)) {
      return NextResponse.json(
        { success: false, message: "Código de acceso incorrecto." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("TICKET_ACCESS_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al verificar el código de acceso.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
