import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const requests = await prisma.eventRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            paternalLastName: true,
            maternalLastName: true,
            email: true,
            phone: true,
          },
        },
        ticketRequests: {
          orderBy: {
            createdAt: "asc",
          },
        },
        event: {
          include: {
            category: true,
            ticketTypes: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("ERROR GET REQUESTS:", error);

    return NextResponse.json(
      {
        error: "Error cargando solicitudes",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}