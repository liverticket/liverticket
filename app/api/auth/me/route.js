import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          paternalLastName: user.paternalLastName,
          maternalLastName: user.maternalLastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ME_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo obtener el usuario actual." },
      { status: 500 }
    );
  }
}