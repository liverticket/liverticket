import { NextResponse } from "next/server";
import { deleteCurrentSession, SESSION_COOKIE_NAME } from "../../../../lib/auth";

export async function POST() {
  try {
    await deleteCurrentSession();

    const response = NextResponse.json(
      { message: "Sesión cerrada correctamente." },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("LOGOUT_ERROR:", error);

    return NextResponse.json(
      { error: "No se pudo cerrar la sesión." },
      { status: 500 }
    );
  }
}