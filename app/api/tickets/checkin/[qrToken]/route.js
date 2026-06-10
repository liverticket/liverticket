import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request, { params }) {
  try {
    const { qrToken } = await params;
    const body = await request.json();
    const scannerCode = String(body.scannerCode || "").trim();

    if (!scannerCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Debes ingresar el código de acceso.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: {
        qrToken,
      },
      include: {
        event: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          message: "Entrada no encontrada.",
        },
        { status: 404 }
      );
    }

    if (!ticket.event?.scannerCode || ticket.event.scannerCode !== scannerCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Código de acceso incorrecto.",
        },
        { status: 403 }
      );
    }

    if (ticket.status === "USED") {
      return NextResponse.json(
        {
          success: false,
          message: "Esta entrada ya fue utilizada.",
        },
        { status: 400 }
      );
    }

    if (ticket.status !== "VALID") {
      return NextResponse.json(
        {
          success: false,
          message: "La entrada no es válida.",
        },
        { status: 400 }
      );
    }

    await prisma.ticket.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "USED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ingreso registrado correctamente.",
    });
  } catch (error) {
    console.error("TICKET_CHECKIN_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar ingreso.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}