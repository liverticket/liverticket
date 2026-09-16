import { requireAdmin } from "@/lib/auth";
import { chileToday, toDatabaseDate } from "@/lib/event-date.mjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const events = await prisma.event.findMany({
      where: {
        visibility: "PUBLISHED",
        date: {
          gte: toDatabaseDate(chileToday()),
        },
      },
      include: {
        category: true,
      },
      orderBy: [
        { isFeatured: "desc" },
        { featuredOrder: "asc" },
        { date: "asc" },
      ],
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET destacados error:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los eventos destacados." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await request.json();
    const events = Array.isArray(body.events) ? body.events : [];

    await prisma.$transaction(
      events.map((event) =>
        prisma.event.update({
          where: { id: event.id },
          data: {
            isFeatured: Boolean(event.isFeatured),
            featuredOrder: event.isFeatured ? Number(event.featuredOrder || 0) : null,
            featuredImageUrl: event.featuredImageUrl || null,
          },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT destacados error:", error);

    return NextResponse.json(
      { error: "No se pudieron guardar los destacados." },
      { status: 500 }
    );
  }
}