import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request, context) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const visibility = body.visibility;

    if (!["PUBLISHED", "DRAFT"].includes(visibility)) {
      return NextResponse.json(
        { error: "Visibility inválida." },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento no encontrado." },
        { status: 404 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { visibility },
    });

    return NextResponse.json({
      ok: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("ADMIN_EVENT_VISIBILITY_ERROR:", error);
    return NextResponse.json(
      {
        error: "No se pudo cambiar la visibilidad del evento.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}