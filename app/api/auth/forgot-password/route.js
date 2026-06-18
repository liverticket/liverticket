import { NextResponse } from "next/server";
import crypto from "crypto";

import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Debes ingresar un correo." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    // Por seguridad, no decimos si el correo existe o no
    if (!user) {
      return NextResponse.json({
        message:
          "Si el correo existe en LiverTicket, enviaremos un enlace de recuperación.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
    });

    return NextResponse.json({
      message:
        "Si el correo existe en LiverTicket, enviaremos un enlace de recuperación.",
    });
  } catch (error) {
    console.error("Error forgot-password:", error);

    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 500 }
    );
  }
}