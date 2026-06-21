import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para enviar una solicitud." },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const company = String(formData.get("company") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const eventName = String(formData.get("eventName") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const tentativeDate = String(formData.get("tentativeDate") || "").trim();

    const minAgeRaw = String(
      formData.get("minAge") || formData.get("ageMin") || ""
    ).trim();

    const eventTime = String(formData.get("eventTime") || "").trim();

    const region = String(formData.get("region") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const venue = String(formData.get("venue") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const flyerUrl = String(formData.get("flyerUrl") || "").trim();

    const rawTicketTypes = String(formData.get("ticketTypes") || "[]");

    let ticketTypes = [];

    try {
      ticketTypes = JSON.parse(rawTicketTypes);
    } catch {
      return NextResponse.json(
        { error: "Los tipos de entrada no tienen un formato válido." },
        { status: 400 }
      );
    }

    if (
      !firstName ||
      !lastName ||
      !company ||
      !email ||
      !phone ||
      !eventName ||
      !category ||
      !tentativeDate ||
      !minAgeRaw ||
      !eventTime ||
      !region ||
      !city ||
      !venue ||
      !address ||
      !message
    ) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios deben estar completos." },
        { status: 400 }
      );
    }

    if (!flyerUrl) {
      return NextResponse.json(
        { error: "Debes subir un flyer del evento." },
        { status: 400 }
      );
    }

    const minAge = Number(minAgeRaw);

    if (!Number.isFinite(minAge) || minAge < 0) {
      return NextResponse.json(
        { error: "La edad mínima no es válida." },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(eventTime)) {
      return NextResponse.json(
        { error: "La hora del evento no es válida." },
        { status: 400 }
      );
    }

    if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
      return NextResponse.json(
        { error: "Debes agregar al menos un tipo de entrada." },
        { status: 400 }
      );
    }

    const normalizedTicketTypes = ticketTypes.map((ticket) => ({
      name: String(ticket.name || "").trim(),
      description: String(ticket.description || "").trim(),
      price: Number(ticket.price),
      stock: ticket.unlimitedStock ? null : Number(ticket.stock),
      unlimitedStock: Boolean(ticket.unlimitedStock),
    }));

    const invalidTicket = normalizedTicketTypes.find(
      (ticket) =>
        !ticket.name ||
        !Number.isFinite(ticket.price) ||
        ticket.price <= 0 ||
        (!ticket.unlimitedStock &&
          (!Number.isFinite(ticket.stock) || ticket.stock <= 0))
    );

    if (invalidTicket) {
      return NextResponse.json(
        {
          error:
            "Cada tipo de entrada debe tener nombre, precio válido y stock válido, salvo que uses stock ilimitado.",
        },
        { status: 400 }
      );
    }

    const eventRequest = await prisma.eventRequest.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        company,
        email,
        phone,
        eventName,
        category,
        tentativeDate: new Date(`${tentativeDate}T00:00:00`),

        minAge,
        eventTime,

        region,
        city,
        venue,
        address,
        message,
        flyerUrl,
        status: "PENDING",

        ticketRequests: {
          create: normalizedTicketTypes.map((ticket) => ({
            name: ticket.name,
            description: ticket.description || null,
            price: ticket.price,
            stock: ticket.unlimitedStock ? null : ticket.stock,
            unlimitedStock: ticket.unlimitedStock,
          })),
        },
      },
      include: {
        ticketRequests: true,
      },
    });

    return NextResponse.json({
      ok: true,
      eventRequest,
    });
  } catch (error) {
    console.error("CREATE_EVENT_REQUEST_ERROR:", error);

    return NextResponse.json(
      {
        error: "No se pudo enviar la solicitud.",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}