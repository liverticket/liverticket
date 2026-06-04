"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function formatMoney(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(date) {
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function MyEventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/my-events/${params.id}`, {
          cache: "no-store",
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "No se pudo cargar el evento");
        }

        setEvent(data.event);
      } catch (error) {
        console.error(error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadEvent();
    }
  }, [params.id]);

  const salesRows = event?.salesByTicketType || [];

  return (
    <main className="page">
      <Navbar />

      <section className="myEventDetailPage">
        <div className="container">
          <Link href="/mis-eventos" className="myEventBack">
            ← Volver a Mis Eventos
          </Link>

          {loading ? (
            <div className="myEventsEmpty">
              <h2>Cargando evento...</h2>
            </div>
          ) : !event ? (
            <div className="myEventsEmpty">
              <h2>No se encontró el evento</h2>
              <p>Este evento no existe o no pertenece a tu cuenta.</p>
            </div>
          ) : (
            <>
              <div className="myEventAdminHeader">
                <span className="myEventStatus status-PUBLISHED">Publicado</span>

                <h1>{event.title}</h1>

                <div className="myEventAdminMeta">
                  <span>{formatDate(event.date)}</span>
                  <span>{event.eventTime}</span>
                  <span>
                    {event.venue || event.location}
                    {event.city ? ` · ${event.city}` : ""}
                  </span>
                  <span>Edad mínima {event.minAge}+</span>
                </div>
              </div>

              <div className="myEventDetailBlock">
                <div className="myEventDetailBlockHeader">
                  <div>
                    <h2>Resumen de ventas</h2>
                    <p>Detalle contable por tipo de entrada.</p>
                  </div>
                </div>

                <div className="myEventSalesTable">
                  <div className="myEventSalesHead">
                    <span>Tipo de entrada</span>
                    <span>Vendidas</span>
                    <span>Precio</span>
                    <span>Recaudación</span>
                  </div>

                  {salesRows.map((row) => (
                    <div className="myEventSalesRow" key={row.id}>
                      <span>{row.name}</span>
                      <span>{row.sold}</span>
                      <span>{formatMoney(row.price)}</span>
                      <span>{formatMoney(row.revenue)}</span>
                    </div>
                  ))}

                  <div className="myEventSalesRow total">
                    <span>Total</span>
                    <span>{event.soldTickets}</span>
                    <span>—</span>
                    <span>{formatMoney(event.totalSales)}</span>
                  </div>
                </div>
              </div>

              <div className="myEventDetailBlock">
                <div className="myEventDetailBlockHeader">
                  <div>
                    <h2>Asistentes</h2>
                    <p>
                      Disponible hasta {formatDate(event.attendeesVisibleUntil)}.
                    </p>
                  </div>
                </div>

                {!event.canViewAttendees ? (
                  <div className="myEventPrivacyBox">
                    La lista de asistentes expiró por protección de datos. Solo
                    se mantienen estadísticas generales del evento.
                  </div>
                ) : event.attendees.length === 0 ? (
                  <div className="myEventPrivacyBox">
                    Aún no hay asistentes registrados.
                  </div>
                ) : (
                  <div className="myEventAttendeeTable">
                    <div className="myEventAttendeeHead">
                      <span>Nombre</span>
                      <span>Documento</span>
                      <span>Ticket</span>
                      <span>Estado</span>
                    </div>

                    {event.attendees.map((attendee) => (
                      <div className="myEventAttendeeRow" key={attendee.id}>
                        <span>{attendee.attendeeName}</span>
                        <span>
                          {attendee.attendeeDocumentType}{" "}
                          {attendee.attendeeDocumentNumber}
                        </span>
                        <span>{attendee.ticketType}</span>
                        <span>{attendee.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}