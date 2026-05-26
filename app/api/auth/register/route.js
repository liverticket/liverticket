import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

function validatePassword(password) {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir al menos una mayúscula.";
  if (!/[0-9]/.test(password)) return "La contraseña debe incluir al menos un número.";
  if (!/[!@#$%^&*(),.?\":{}|<>_\-\\[\]/+=;']/.test(password)) {
    return "La contraseña debe incluir al menos un símbolo.";
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.toLowerCase().trim();
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Ingresa un correo electrónico válido." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Las contraseñas no coinciden." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe una cuenta activa con ese correo." },
        { status: 409 }
      );
    }

    await prisma.pendingUser.deleteMany({
      where: {
        email,
      },
    });

    await prisma.pendingUser.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const pendingUser = await prisma.pendingUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        expiresAt,
      },
    });

    await sendVerificationEmail({
      to: pendingUser.email,
      name: pendingUser.name,
      token: verificationToken,
    });

    return NextResponse.json(
      {
        message:
          "Te enviamos un correo de verificación. Tu cuenta se activará cuando confirmes tu email.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER_ERROR:", error);

    return NextResponse.json(
      { error: "Error interno al iniciar el registro." },
      { status: 500 }
    );
  }
}