import { formatEventDate } from "@/lib/event-date.mjs";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/qr";
import PrintButton from "./PrintButton";
import "./print.css";

export const metadata = {
  title: "Imprimir entrada",
  robots: { index: false, follow: false },
};

function formatDate(value) {
  if (!value) return null;

  return formatEventDate(value, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

async function getOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  return host ? `${protocol}://${host}` : "https://www.liverticket.cl";
}

export default async function PrintTicketPage({ params }) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      event: true,
      ticketType: true,
      order: true,
    },
  });

  if (!ticket) notFound();

  const canPrint =
    user.role === "ADMIN" || ticket.event.organizerId === user.id;
  if (!canPrint) notFound();

  const origin = await getOrigin();
  const qrValue = `${origin}/ticket/${ticket.qrToken}`;
  const qrDataUrl = await generateQrDataUrl(qrValue);

  return (
    <main className="thermalPrintPage">
      <div className="thermalPrintControls">
        <PrintButton />
      </div>

      <article className="thermalTicket" aria-label={`Entrada ${ticket.code}`}>
        <header className="thermalTicketHeader">
          <div className="thermalBrand">LIVER<span>TICKET</span></div>
          <h1>{ticket.event.title}</h1>
        </header>

        <div className="thermalRule" />

        <section className="thermalEventDetails">
          {ticket.event.date ? <strong>{formatDate(ticket.event.date)}</strong> : null}
          {ticket.event.eventTime ? <p>{ticket.event.eventTime} HRS</p> : null}
          <p className="thermalVenue">
            {ticket.event.venue || ticket.event.location || "Lugar por confirmar"}
          </p>
          {ticket.event.city ? <p>{ticket.event.city}</p> : null}
        </section>

        <section className="thermalTicketType">
          <span>TIPO DE ENTRADA</span>
          <strong>{ticket.ticketType?.name || "Entrada general"}</strong>
        </section>

        {ticket.attendeeName ? (
          <section className="thermalAttendee">
            <span>ASISTENTE</span>
            <strong>{ticket.attendeeName}</strong>
          </section>
        ) : null}

        <section className="thermalQrBlock">
          <img src={qrDataUrl} alt={`QR de la entrada ${ticket.code}`} />
          <strong>{ticket.code}</strong>
        </section>

        {ticket.order?.buyOrder ? (
          <p className="thermalOrder">Orden: {ticket.order.buyOrder}</p>
        ) : null}

        <div className="thermalRule" />

        <footer className="thermalTicketFooter">
          <p>Presenta este código QR al ingresar.</p>
          <strong>www.liverticket.cl</strong>
        </footer>
      </article>
    </main>
  );
}
