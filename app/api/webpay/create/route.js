import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { getWebpayTx } from "../../../../lib/transbank";

function makeBuyOrder() {
  return `LT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function normalizeDocumentNumber(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const { cartItems, guestEmail } = body;

    const buyerEmail = user?.email || String(guestEmail || "").trim().toLowerCase();

    if (!buyerEmail || !isValidEmail(buyerEmail)) {
      return NextResponse.json(
        { error: "Debes ingresar un correo válido para recibir tus entradas." },
        { status: 400 }
      );
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const normalizedItems = cartItems.map((item) => ({
      eventId: String(item.eventId || "").trim(),
      ticketTypeId: String(item.ticketTypeId || "").trim(),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      attendeeName: String(item.attendeeName || "").trim(),
      attendeeDocumentType: String(item.attendeeDocumentType || "").trim(),
      attendeeDocumentNumber: normalizeDocumentNumber(item.attendeeDocumentNumber),
    }));

    const invalidItem = normalizedItems.find(
      (item) =>
        !item.eventId ||
        !item.ticketTypeId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isInteger(item.price) ||
        item.price <= 0 ||
        !item.attendeeName ||
        !item.attendeeDocumentType ||
        !item.attendeeDocumentNumber
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          error:
            "Hay entradas inválidas en el carrito. Verifica nombre completo, tipo de documento, número de documento, cantidad y precio.",
        },
        { status: 400 }
      );
    }

    const ticketTypeIds = [
      ...new Set(normalizedItems.map((item) => item.ticketTypeId)),
    ];

    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        id: { in: ticketTypeIds },
      },
      select: {
        id: true,
        eventId: true,
        price: true,
        stock: true,
        unlimitedStock: true,
        name: true,
      },
    });

    const ticketTypeMap = new Map(ticketTypes.map((tt) => [tt.id, tt]));

    const invalidDbItem = normalizedItems.find((item) => {
      const ticketType = ticketTypeMap.get(item.ticketTypeId);

      if (!ticketType) return true;
      if (ticketType.eventId !== item.eventId) return true;
      if (ticketType.price !== item.price) return true;

      if (!ticketType.unlimitedStock) {
        const availableStock = Number(ticketType.stock || 0);
        if (item.quantity > availableStock) return true;
      }

      return false;
    });

    if (invalidDbItem) {
      return NextResponse.json(
        {
          error:
            "Una o más entradas del carrito ya no son válidas. Vuelve a seleccionar las entradas.",
        },
        { status: 400 }
      );
    }

    const amount = normalizedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "El monto total no es válido." },
        { status: 400 }
      );
    }

    const buyOrder = makeBuyOrder();
    const sessionId = user?.id || `guest-${Date.now()}`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/webpay/retorno`;

    const order = await prisma.order.create({
      data: {
        buyOrder,
        sessionId,
        amount,
        status: "PENDING",
        paymentMethod: "webpay",
        buyerEmail,
        userId: user?.id || null,
        items: {
          create: normalizedItems.map((item) => ({
            eventId: item.eventId,
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            attendeeName: item.attendeeName,
            attendeeDocumentType: item.attendeeDocumentType,
            attendeeDocumentNumber: item.attendeeDocumentNumber,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    const tx = getWebpayTx();
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);

    return NextResponse.json({
      ok: true,
      token: response.token,
      url: response.url,
      buyOrder: order.buyOrder,
      amount: order.amount,
    });
  } catch (error) {
    console.error("WEBPAY_CREATE_ERROR:", error);

    return NextResponse.json(
      {
        error: "No se pudo iniciar el pago con Webpay.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}