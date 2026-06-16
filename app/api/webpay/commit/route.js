import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getWebpayTx } from "../../../../lib/transbank";
import { sendTicketsEmail } from "../../../../lib/email";

function makeTicketCode() {
  return `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          title: "Token faltante",
          message: "No se recibió el token de la transacción.",
        },
        { status: 400 }
      );
    }

    const tx = getWebpayTx();
    const response = await tx.commit(token);

    const approved =
      response.response_code === 0 && response.status === "AUTHORIZED";

    if (!approved) {
      if (response.buy_order) {
        await prisma.order.updateMany({
          where: { buyOrder: response.buy_order },
          data: {
            status: "FAILED",
            rawResponse: response,
          },
        });
      }

      return NextResponse.json({
        success: false,
        title: "Pago rechazado",
        message: "La transacción no fue autorizada por Webpay.",
      });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { buyOrder: response.buy_order },
      include: {
        user: true,
        items: {
          include: {
            ticketType: true,
            event: true,
          },
        },
        tickets: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          title: "Orden no encontrada",
          message: "No encontramos la orden asociada al pago.",
        },
        { status: 404 }
      );
    }

    if (existingOrder.status === "PAID") {
      if (existingOrder.userId) {
        await prisma.cartItem.deleteMany({
          where: {
            userId: existingOrder.userId,
          },
        });
      }

      return NextResponse.json({
        success: true,
        title: "Pago aprobado",
        message: "Tu compra ya había sido confirmada previamente.",
        buyOrder: existingOrder.buyOrder,
        amount: existingOrder.amount,
        authorizationCode: existingOrder.authorizationCode,
        accessToken: existingOrder.accessToken,
        isGuestPurchase: !existingOrder.userId,
      });
    }

    const accessToken = randomUUID();

    await prisma.$transaction(async (txDb) => {
      for (const item of existingOrder.items) {
        const freshTicketType = await txDb.ticketType.findUnique({
          where: { id: item.ticketTypeId },
        });

        if (!freshTicketType) {
          throw new Error(`No existe el tipo de entrada ${item.ticketTypeId}`);
        }

        if (!freshTicketType.unlimitedStock) {
          const availableStock = Number(freshTicketType.stock || 0);

          if (availableStock < item.quantity) {
            throw new Error(
              `No hay stock suficiente para ${freshTicketType.name}`
            );
          }

          await txDb.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      await txDb.order.update({
        where: { id: existingOrder.id },
        data: {
          status: "PAID",
          accessToken,
          authorizationCode: response.authorization_code || null,
          transactionDate: response.transaction_date
            ? new Date(response.transaction_date)
            : new Date(),
          rawResponse: response,
        },
      });

      for (const item of existingOrder.items) {
        const ticketsToCreate = Array.from({ length: item.quantity }).map(() => ({
          code: makeTicketCode(),
          qrToken: randomUUID(),
          attendeeName: item.attendeeName,
          attendeeDocumentType: item.attendeeDocumentType,
          attendeeDocumentNumber: item.attendeeDocumentNumber,
          pricePaid: item.unitPrice,
          orderId: existingOrder.id,
          userId: existingOrder.userId || null,
          eventId: item.eventId,
          ticketTypeId: item.ticketTypeId,
          status: "VALID",
        }));

        await txDb.ticket.createMany({
          data: ticketsToCreate,
        });
      }

      if (existingOrder.userId) {
        await txDb.cartItem.deleteMany({
          where: {
            userId: existingOrder.userId,
          },
        });
      }
    });

    const paidOrder = await prisma.order.findUnique({
      where: { buyOrder: response.buy_order },
      include: {
        user: true,
        tickets: {
          include: {
            event: true,
            ticketType: true,
          },
        },
      },
    });

    const emailToSend = paidOrder?.user?.email || paidOrder?.buyerEmail;

    console.log("EMAIL_TO_SEND:", emailToSend);
    console.log("TICKETS_TO_SEND:", paidOrder?.tickets?.length);
    console.log("INTENTANDO_ENVIAR_CORREO_TICKETS");

    try {
      if (emailToSend && paidOrder?.tickets?.length > 0) {

        console.log("ENVIANDO_CORREO_A:", emailToSend);

        await sendTicketsEmail({
          to: emailToSend,
          order: paidOrder,
          tickets: paidOrder.tickets,
        }); 
        console.log("CORREO_ENVIADO_OK");
      }
    } catch (emailError) {
      console.error("SEND_TICKETS_EMAIL_ERROR:", emailError);
    }

    return NextResponse.json({
      success: true,
      title: "Pago aprobado",
      message: "Tu compra fue confirmada correctamente.",
      buyOrder: paidOrder?.buyOrder,
      amount: paidOrder?.amount,
      authorizationCode: paidOrder?.authorizationCode,
      accessToken: paidOrder?.accessToken,
      isGuestPurchase: !paidOrder?.userId,
    });
  } catch (error) {
    console.error("WEBPAY_COMMIT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        title: "Error de confirmación",
        message: "No se pudo confirmar la transacción con Webpay.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}