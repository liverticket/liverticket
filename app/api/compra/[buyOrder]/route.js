import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(request, { params }) {
  try {
    const { buyOrder } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!buyOrder || !token) {
      return NextResponse.json(
        { error: "Datos de compra inválidos." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        buyOrder,
        accessToken: token,
        status: "PAID",
      },
      include: {
        tickets: {
          include: {
            event: true,
            ticketType: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "No encontramos esta compra." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        buyOrder: order.buyOrder,
        amount: order.amount,
        buyerEmail: order.buyerEmail,
        authorizationCode: order.authorizationCode,
        transactionDate: order.transactionDate,
      },
      tickets: order.tickets,
    });
  } catch (error) {
    console.error("GET_PUBLIC_PURCHASE_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo cargar la compra." },
      { status: 500 }
    );
  }
}