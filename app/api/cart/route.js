import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function normalizeDocumentNumber(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
}

function mapCartItem(item) {
  return {
    cartItemId: item.id,
    eventId: item.eventId,
    eventTitle: item.event.title,
    eventImageUrl: item.event.imageUrl || "/placeholder-event.jpg",
    eventDate: item.event.date,
    eventVenue: item.event.venue || item.event.location || "Lugar por definir",
    eventAddress: [item.event.address, item.event.city, item.event.region]
      .filter(Boolean)
      .join(", "),
    ticketTypeId: item.ticketTypeId,
    ticketName: item.ticketType.name,
    price: item.price,
    quantity: item.quantity,
    attendeeName: item.attendeeName,
    attendeeDocumentType: item.attendeeDocumentType,
    attendeeDocumentNumber: item.attendeeDocumentNumber,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ cartItems: [] }, { status: 200 });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        event: true,
        ticketType: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      cartItems: cartItems.map(mapCartItem),
    });
  } catch (error) {
    console.error("CART_GET_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el carrito." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para guardar el carrito." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const eventId = String(body.eventId || "").trim();
    const ticketTypeId = String(body.ticketTypeId || "").trim();
    const quantity = Number(body.quantity || 1);
    const attendeeName = String(body.attendeeName || "").trim();
    const attendeeDocumentType = String(body.attendeeDocumentType || "").trim();
    const attendeeDocumentNumber = normalizeDocumentNumber(
      body.attendeeDocumentNumber
    );

    if (
      !eventId ||
      !ticketTypeId ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !attendeeName ||
      !attendeeDocumentType ||
      !attendeeDocumentNumber
    ) {
      return NextResponse.json(
        { error: "Faltan datos para agregar la entrada al carrito." },
        { status: 400 }
      );
    }

    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: {
        event: true,
      },
    });

    if (!ticketType || ticketType.eventId !== eventId) {
      return NextResponse.json(
        { error: "La entrada seleccionada no es válida." },
        { status: 400 }
      );
    }

    if (!ticketType.unlimitedStock && Number(ticketType.stock || 0) < quantity) {
      return NextResponse.json(
        { error: "No queda stock disponible para esta entrada." },
        { status: 400 }
      );
    }

    const cartItem = await prisma.cartItem.create({
      data: {
        userId: user.id,
        eventId,
        ticketTypeId,
        quantity,
        price: ticketType.price,
        attendeeName,
        attendeeDocumentType,
        attendeeDocumentNumber,
      },
      include: {
        event: true,
        ticketType: true,
      },
    });

    return NextResponse.json({
      ok: true,
      cartItem: mapCartItem(cartItem),
    });
  } catch (error) {
    console.error("CART_POST_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo agregar la entrada al carrito." },
      { status: 500 }
    );
  }
}