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
              <div className="myEventDetailHero">
                <div className="myEventDetailImageWrap">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="myEventDetailImage"
                    />
                  ) : (
                    <div className="myEventImagePlaceholder">Sin flyer</div>
                  )}
                </div>

                <div className="myEventDetailInfo">
                  <span className="myEventStatus status-PUBLISHED">
                    Publicado
                  </span>

                  <h1>{event.title}</h1>

                  <p>
                    {formatDate(event.date)} · {event.eventTime}
                  </p>

                  <p>
                    {event.venue || event.location}
                    {event.city ? ` · ${event.city}` : ""}
                  </p>

                  <p>Edad mínima {event.minAge}+</p>

                  <div className="myEventDetailStats">
                    <div>
                      <span>Vendidas</span>
                      <strong>{event.soldTickets}</strong>
                    </div>

                    <div>
                      <span>Recaudación</span>
                      <strong>{formatMoney(event.totalSales)}</strong>
                    </div>

                    <div>
                      <span>Tipos de ticket</span>
                      <strong>{event.ticketTypes.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="myEventDetailBlock">
                <h2>Tipos de ticket</h2>

                <div className="myEventTicketList">
                  {event.ticketTypes.map((ticketType) => (
                    <div className="myEventTicketRow" key={ticketType.id}>
                      <div>
                        <strong>{ticketType.name}</strong>
                        <span>
                          {ticketType.unlimitedStock
                            ? "Stock ilimitado"
                            : `Stock: ${ticketType.stock ?? 0}`}
                        </span>
                      </div>

                      <strong>{formatMoney(ticketType.price)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="myEventDetailBlock">
                <div className="myEventDetailBlockHeader">
                  <div>
                    <h2>Asistentes</h2>
                    <p>
                      Disponible hasta{" "}
                      {formatDate(event.attendeesVisibleUntil)}.
                    </p>
                  </div>
                </div>

                {!event.canViewAttendees ? (
                  <div className="myEventPrivacyBox">
                    La lista de asistentes expiró por protección de datos.
                    Solo se mantienen estadísticas generales del evento.
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