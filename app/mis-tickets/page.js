"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { generateQrDataUrl } from "../../lib/qr";

function formatDate(dateString) {
  if (!dateString) return "Fecha por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString) {
  if (!dateString) return "Hora por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getTicketStatusLabel(status) {
  if (status === "VALID") return "Válida";
  if (status === "USED") return "Usada";
  if (status === "CANCELLED") return "Cancelada";
  return status || "Activa";
}

function getTicketStatusClass(status) {
  if (status === "VALID") return "statusVigente";
  if (status === "USED") return "statusValidado";
  if (status === "CANCELLED") return "statusExpirado";
  return "statusVigente";
}

export default function MisTicketsPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrMap, setQrMap] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    async function loadTickets() {
      try {
        const res = await fetch("/api/my-tickets", {
          cache: "no-store",
        });

        if (res.status === 401) {
          router.push("/ingresar?redirect=/mis-tickets");
          return;
        }

        const data = await res.json();
        const fetchedTickets = data.tickets || [];

        setTickets(fetchedTickets);

        const qrEntries = await Promise.all(
          fetchedTickets.map(async (ticket) => {
            const qrValue = `${window.location.origin}/ticket/${ticket.qrToken}`;
            const qrUrl = await generateQrDataUrl(qrValue);
            return [ticket.id, qrUrl];
          })
        );

        setQrMap(Object.fromEntries(qrEntries));
      } catch (error) {
        console.error("Error cargando tickets:", error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, [router]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setSelectedTicket(null);
      }
    }

    if (selectedTicket) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedTicket]);

  const sortedTickets = useMemo(() => {
    return [...tickets];
  }, [tickets]);

  return (
    <>
      <Navbar />

      <main className="ticketsPage">
        <div className="ticketsShell">
          <div className="ticketsHeader">
            <div>
              <p className="ticketsTag">MIS TICKETS</p>
              <h1>Tus entradas</h1>
              <p className="ticketsSubtitle">
                Aquí encontrarás tus entradas compradas, su información y el
                código QR de acceso.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="ticketsEmptyCard">
              <h1>Cargando tickets...</h1>
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="ticketsEmptyCard">
              <h1>No tienes tickets aún</h1>
              <p>Cuando compres entradas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="ticketsTableWrap">
              <div className="ticketsTableHeader">
                <div>Afiche</div>
                <div>Evento</div>
                <div>Tipo</div>
                <div>Lugar y fecha</div>
                <div>Valor</div>
                <div>eTicket</div>
                <div>Compra</div>
                <div>Acción</div>
              </div>

              <div className="ticketsTableBody">
                {sortedTickets.map((ticket) => {
                  const venue =
                    ticket.event?.venue ||
                    ticket.event?.location ||
                    "Lugar por definir";

                  const fullAddress = [
                    ticket.event?.address,
                    ticket.event?.city,
                    ticket.event?.region,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <div key={ticket.id} className="ticketsTableRow">
                      <div className="ticketsCell ticketsCellPoster">
                        <img
                          src={
                            ticket.event?.imageUrl || "/placeholder-event.jpg"
                          }
                          alt={ticket.event?.title || "Evento"}
                          className="ticketsTablePoster"
                        />
                      </div>

                      <div className="ticketsCell">
                        <div className="ticketsEventName">
                          {ticket.event?.title || "Evento"}
                        </div>
                        <div
                          className={`ticketsRowStatus ${getTicketStatusClass(
                            ticket.status
                          )}`}
                        >
                          {getTicketStatusLabel(ticket.status)}
                        </div>
                        <div className="ticketsAttendeeLine">
                          {ticket.attendeeName}
                        </div>
                      </div>

                      <div className="ticketsCell">
                        <div className="ticketsTypeName">
                          {ticket.ticketType?.name || "Entrada"}
                        </div>
                      </div>

                      <div className="ticketsCell">
                        <div className="ticketsVenueName">{venue}</div>
                        <div className="ticketsDateLine">
                          {formatDate(ticket.event?.date)}
                        </div>
                        <div className="ticketsDateLine">
                          {formatTime(ticket.event?.date)} hrs
                        </div>
                        {fullAddress ? (
                          <div className="ticketsAddressSmall">
                            {fullAddress}
                          </div>
                        ) : null}
                      </div>

                      <div className="ticketsCell">
                        <div className="ticketsPriceValue">
                          {formatPrice(
                            ticket.pricePaid ?? ticket.ticketType?.price ?? 0
                          )}
                        </div>
                      </div>

                      <div className="ticketsCell">
                        <div className="ticketsCodeValue">{ticket.code}</div>
                      </div>

                      <div className="ticketsCell">
                        <div className="ticketsOrderValue">
                          {ticket.order?.buyOrder || "Sin orden"}
                        </div>
                      </div>

                      <div className="ticketsCell ticketsCellAction">
                        <button
                          type="button"
                          className="ticketDetailButton"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          Ver ticket
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedTicket ? (
        <div
          className="ticketModalOverlay"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="ticketModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ticketModalClose"
              onClick={() => setSelectedTicket(null)}
            >
              ✕
            </button>

            <div className="ticketModalTopRow">
              <div className="ticketTopRow">
                <span className="ticketType">
                  {selectedTicket.ticketType?.name || "Entrada"}
                </span>
                <span
                  className={`ticketStatus ${getTicketStatusClass(
                    selectedTicket.status
                  )}`}
                >
                  {getTicketStatusLabel(selectedTicket.status)}
                </span>
              </div>
            </div>

            <div className="ticketModalBody">
              <div className="ticketModalPosterCol">
                <img
                  src={
                    selectedTicket.event?.imageUrl || "/placeholder-event.jpg"
                  }
                  alt={selectedTicket.event?.title || "Evento"}
                  className="ticketModalPoster"
                />
              </div>

              <div className="ticketModalInfoCol">
                <h2>{selectedTicket.event?.title || "Evento"}</h2>

                <p className="ticketPlace">
                  {selectedTicket.event?.venue ||
                    selectedTicket.event?.location ||
                    "Lugar por definir"}
                </p>

                <p className="ticketAddress">
                  {[
                    selectedTicket.event?.address,
                    selectedTicket.event?.city,
                    selectedTicket.event?.region,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Dirección por confirmar"}
                </p>

                <div className="ticketMeta">
                  <div>
                    <span className="ticketMetaLabel">Fecha</span>
                    <strong>{formatDate(selectedTicket.event?.date)}</strong>
                  </div>

                  <div>
                    <span className="ticketMetaLabel">Hora</span>
                    <strong>
                      {formatTime(selectedTicket.event?.date)} hrs
                    </strong>
                  </div>

                  <div>
                    <span className="ticketMetaLabel">Valor</span>
                    <strong>
                      {formatPrice(
                        selectedTicket.pricePaid ??
                          selectedTicket.ticketType?.price ??
                          0
                      )}
                    </strong>
                  </div>
                </div>

                <div className="ticketDetailsGrid">
                  <div>
                    <span className="ticketMetaLabel">Asistente</span>
                    <strong>{selectedTicket.attendeeName}</strong>
                  </div>

                  <div>
                    <span className="ticketMetaLabel">Documento</span>
                    <strong>
                      {selectedTicket.attendeeDocumentType}:{" "}
                      {selectedTicket.attendeeDocumentNumber}
                    </strong>
                  </div>

                  <div>
                    <span className="ticketMetaLabel">Código ticket</span>
                    <strong>{selectedTicket.code}</strong>
                  </div>

                  <div>
                    <span className="ticketMetaLabel">Compra</span>
                    <strong>
                      {selectedTicket.order?.buyOrder || "Sin orden"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="ticketModalQrCol">
                {qrMap[selectedTicket.id] ? (
                  <img
                    src={qrMap[selectedTicket.id]}
                    alt={`QR ${selectedTicket.code}`}
                    className="ticketQrImage"
                  />
                ) : (
                  <div className="ticketQrPlaceholder">Generando QR...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </>
  );
}