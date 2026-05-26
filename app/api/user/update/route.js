import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function toTitleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function PUT(req) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const name = toTitleCase(body.name);
    const paternalLastName = toTitleCase(body.paternalLastName);
    const maternalLastName = toTitleCase(body.maternalLastName);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "El correo es obligatorio." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Ingresa un correo válido." },
        { status: 400 }
      );
    }

    if (phone && !/^\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "El teléfono debe tener exactamente 9 dígitos numéricos." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        paternalLastName: paternalLastName || null,
        maternalLastName: maternalLastName || null,
        email,
        phone: phone || null,
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        paternalLastName: updatedUser.paternalLastName,
        maternalLastName: updatedUser.maternalLastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("UPDATE_USER_ERROR:", error);

    return NextResponse.json(
      { error: "Error actualizando usuario." },
      { status: 500 }
    );
  }
}