"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function formatDate(date) {
  if (!date) return "Fecha no definida";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Pendiente",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    PUBLISHED: "Publicado",
    DRAFT: "Borrador",
  };

  return labels[status] || status || "Sin estado";
}

export default function MisEventosPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [visibleCodeEventId, setVisibleCodeEventId] = useState(null);

  useEffect(() => {
    async function loadMyEvents() {
      try {
        const res = await fetch("/api/my-events", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("No se pudieron cargar tus eventos");
        }

        const data = await res.json();

        setRequests(data.requests || []);
        setEvents(data.events || []);
      } catch (error) {
        console.error(error);
        setRequests([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    loadMyEvents();
  }, []);

  const myEvents = useMemo(() => {
    return requests.map((request) => {
      const approvedEvent = events.find((event) => event.id === request.eventId);

      return {
        id: request.id,
        request,
        approvedEvent,
        status: request.status,
        title: approvedEvent?.title || request.eventName,
        flyerUrl: approvedEvent?.imageUrl || request.flyerUrl,
        date: approvedEvent?.date || request.tentativeDate,
        eventTime: approvedEvent?.eventTime || request.eventTime,
        venue: approvedEvent?.venue || request.venue,
        city: approvedEvent?.city || request.city,
        category: approvedEvent?.category || request.category,
        minAge: approvedEvent?.minAge ?? request.minAge,
      };
    });
  }, [requests, events]);

  const hasData = myEvents.length > 0;

  return (
    <main className="page">
      <Navbar />

      <section className="myEventsPage">
        <div className="container">
          <div className="myEventsHeader">
            <span>Panel productor</span>
            <h1>Mis Eventos</h1>
            <p>Administra tus eventos, estados, ventas y estadísticas.</p>
          </div>

          {loading ? (
            <div className="myEventsEmpty">
              <h2>Cargando tus eventos...</h2>
            </div>
          ) : !hasData ? (
            <div className="myEventsEmpty">
              <h2>Aún no tienes eventos creados</h2>
              <p>
                Cuando envíes una solicitud para crear un evento, aparecerá aquí.
              </p>

              <Link href="/crearevento" className="myEventsPrimaryButton">
                Crear mi primer evento
              </Link>
            </div>
          ) : (
            <div className="myEventsGrid">
              {myEvents.map((item) => {
                const isApproved = item.status === "APPROVED" && item.approvedEvent;
                const isPending = item.status === "PENDING";
                const isRejected = item.status === "REJECTED";
                const isCodeVisible =
                  visibleCodeEventId === item.approvedEvent?.id;

                return (
                  <article className="myEventCard premium" key={item.id}>
                    <div className="myEventImageWrap premium">
                      {item.flyerUrl ? (
                        <img
                          src={item.flyerUrl}
                          alt={item.title}
                          className="myEventImage"
                        />
                      ) : (
                        <div className="myEventImagePlaceholder">Sin flyer</div>
                      )}

                      <span className={`myEventStatus status-${item.status}`}>
                        {isApproved ? "Aprobado" : getStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="myEventBody premium">
                      <h3>{item.title}</h3>

                      <p>
                        {formatDate(item.date)}
                        {item.eventTime ? ` · ${item.eventTime}` : ""}
                      </p>

                      <p>
                        {item.venue}
                        {item.city ? ` · ${item.city}` : ""}
                      </p>

                      <p>
                        {item.category} · Edad mínima {item.minAge}+
                      </p>

                      {isPending && (
                        <div className="myEventPendingBox">
                          Tu evento está siendo revisado por el equipo de
                          LiverTicket.
                        </div>
                      )}

                      {isRejected && (
                        <div className="myEventRejectedBox">
                          La solicitud fue rechazada.
                        </div>
                      )}

                      {isApproved && (
                        <>
                          <div className="myEventStats premium">
                            <div>
                              <span>Vendidas</span>
                              <strong>
                                {item.approvedEvent.soldTickets || 0}
                              </strong>
                            </div>

                            <div>
                              <span>Recaudación</span>
                              <strong>
                                {formatMoney(
                                  Math.round((item.approvedEvent.totalSales || 0) * 0.9)
                                )}
                              </strong>
                            </div>
                          </div>

                          

                          <div className="myEventActions">
                            <Link
                              href={`/mis-eventos/${item.approvedEvent.id}`}
                              className="myEventButton"
                            >
                              Administrar
                            </Link>
                            <div className="myEventScannerCodeBox">
                              {!isCodeVisible ? (
                                <button
                                  type="button"
                                  className="myEventScannerCodeButton"
                                  onClick={() => setVisibleCodeEventId(item.approvedEvent.id)}
                                >
                                  Ver código para escanear QR
                                </button>
                              ) : (
                                <div className="myEventScannerCodeReveal">
                                  <span>Código acceso</span>
                                  <strong>{item.approvedEvent.scannerCode || "----"}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}