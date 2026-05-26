import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function redirectToLogin(status) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/ingresar?verified=${status}`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return redirectToLogin("invalid");
    }

    const pendingUser = await prisma.pendingUser.findUnique({
      where: {
        verificationToken: token,
      },
    });

    if (!pendingUser) {
      return redirectToLogin("invalid");
    }

    if (pendingUser.expiresAt < new Date()) {
      await prisma.pendingUser.delete({
        where: {
          id: pendingUser.id,
        },
      });

      return redirectToLogin("expired");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: pendingUser.email,
      },
    });

    if (existingUser) {
      await prisma.pendingUser.delete({
        where: {
          id: pendingUser.id,
        },
      });

      return redirectToLogin("already-active");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          name: pendingUser.name,
          email: pendingUser.email,
          password: pendingUser.password,
          role: "USER",
        },
      });

      await tx.pendingUser.delete({
        where: {
          id: pendingUser.id,
        },
      });
    });

    return redirectToLogin("success");
  } catch (error) {
    console.error("VERIFY_EMAIL_ERROR:", error);
    return redirectToLogin("error");
  }
}