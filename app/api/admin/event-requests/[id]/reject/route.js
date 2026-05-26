import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request, context) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await context.params;

    const eventRequest = await prisma.eventRequest.findUnique({
      where: { id },
    });

    if (!eventRequest) {
      return NextResponse.json(
        { error: "Solicitud no encontrada." },
        { status: 404 }
      );
    }

    if (eventRequest.status === "REJECTED") {
      return NextResponse.json(
        { error: "La solicitud ya fue rechazada." },
        { status: 400 }
      );
    }

    if (eventRequest.status === "APPROVED") {
      return NextResponse.json(
        { error: "La solicitud ya fue aprobada y no se puede rechazar." },
        { status: 400 }
      );
    }

    await prisma.eventRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("REJECT_EVENT_REQUEST_ERROR:", error);

    return NextResponse.json(
      {
        error: "No se pudo rechazar la solicitud.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}