import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const cartItemId = resolvedParams.id;

    await prisma.cartItem.deleteMany({
      where: {
        id: cartItemId,
        userId: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CART_DELETE_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo quitar la entrada del carrito." },
      { status: 500 }
    );
  }
}