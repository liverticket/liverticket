import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: {
        visibility: "PUBLISHED",
        date: {
          gte: new Date(),
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