"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return "Fecha por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatDateTime(dateString) {
  if (!dateString) return "Fecha por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function getTicketStatus(status) {
  if (status === "USED") return "USADA";
  if (status === "CANCELLED") return "CANCELADA";
  return "VÁLIDA";
}

function getQrUrl(token) {
  if (typeof window === "undefined") return "";

  const qrValue = `${window.location.origin}/ticket/${token}`;

  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    qrValue
  )}`;
}

async function waitForImages(element) {
  const images = Array.from(element.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }

          img.onload = resolve;
          img.onerror = resolve;
        })
    )
  );
}

export default function CompraExitosaPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const buyOrder = params?.buyOrder;
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [order, setOrder] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPurchase() {
      try {
        const res = await fetch(
          `/api/compra/${buyOrder}?token=${encodeURIComponent(token || "")}`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "No se pudo cargar la compra.");
          return;
        }

        setOrder(data.order);
        setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      } catch {
        setError("No se pudo cargar la compra.");
      } finally {
        setLoading(false);
      }
    }

    if (buyOrder && token) {
      loadPurchase();
    } else {
      setError("Link de compra inválido.");
      setLoading(false);
    }
  }, [buyOrder, token]);

  async function handleDownloadPdf() {
    try {
      setDownloadingPdf(true);

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const ticketCards = Array.from(
        document.querySelectorAll(".guestTicketCard")
      );

      if (ticketCards.length === 0) {
        alert("No se encontraron tickets para descargar.");
        return;
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      for (let index = 0; index < ticketCards.length; index += 1) {
        const card = ticketCards[index];

        await waitForImages(card);

        const canvas = await html2canvas(card, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");

        const ratio = Math.min(
          usableWidth / canvas.width,
          usableHeight / canvas.height
        );

        const imgWidth = canvas.width * ratio;
        const imgHeight = canvas.height * ratio;

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      }

      pdf.save(`LiverTicket-${order?.buyOrder || "tickets"}.pdf`);
    } catch (error) {
      console.error("DOWNLOAD_TICKETS_PDF_ERROR:", error);
      alert("No se pudo descargar el PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="ticketsPage guestPurchasePage">
        <div className="ticketsShell">
          {loading ? (
            <div className="guestPurchaseHero">
              <h1>Cargando compra...</h1>
              <p>Estamos preparando tus entradas.</p>
            </div>
          ) : error ? (
            <div className="guestPurchaseHero">
              <h1>No pudimos cargar tus entradas</h1>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <section className="guestPurchaseHero noPrint">
                

                <div className="guestPurchaseHeroText">
                  <h1>¡Compra exitosa!</h1>

                  
                  <p>
                    Tus entradas están listas. También las enviaremos al correo{" "}
                    <strong>{order?.buyerEmail}</strong>.
                  </p>
                </div>

                <div className="guestPurchaseActions">
                  <button
                    type="button"
                    className="btn btnPrimary"
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                  >
                    {downloadingPdf ? "Generando PDF..." : "Descargar PDF"}
                  </button>

                  <a href="/" className="btn btnSecondary">
                    Volver al inicio
                  </a>
                </div>
              </section>

              

              <section className="guestTicketsPrintArea">
                {tickets.map((ticket) => {
                  const event = ticket.event || {};
                  const ticketType = ticket.ticketType || {};
                  const venue =
                    event.venue || event.location || "Lugar por confirmar";
                  const address = [event.address, event.city, event.region]
                    .filter(Boolean)
                    .join(", ");
                  const eventImage =
                    event.imageUrl || "/placeholder-event.jpg";

                  return (
                    <article key={ticket.id} className="guestTicketCard">
                      <div className="guestTicketSide">
                        <img
                          src={eventImage}
                          alt={event.title || "Flyer del evento"}
                          className="guestTicketFlyer"
                          crossOrigin="anonymous"
                        />

                        <div className="guestTicketSideOverlay"></div>

                        <div className="guestTicketSideContent">
                          <span className="guestTicketStatus">
                            {getTicketStatus(ticket.status)}
                          </span>

                          <h3>{ticketType.name || "Entrada"}</h3>

                          <div className="guestTicketBrand">
                            <span>L</span>iverTicket
                          </div>

                          <p>
                            Tu entrada
                            <br />a los mejores
                            <br />
                            <strong>eventos</strong>
                          </p>
                        </div>
                      </div>

                      <div className="guestTicketMain">
                        <div className="guestTicketInfo">
                          <h2>{event.title || "Evento"}</h2>

                          <p className="guestTicketVenue">{venue}</p>

                          {address && (
                            <p className="guestTicketAddress">{address}</p>
                          )}

                          <div className="guestTicketMetaGrid">
                            <div>
                              <span>Fecha</span>
                              <strong>{formatDate(event.date)}</strong>
                            </div>

                            <div>
                              <span>Hora</span>
                              <strong>
                                {event.eventTime
                                  ? `${event.eventTime} hrs`
                                  : "Por confirmar"}
                              </strong>
                            </div>

                            <div>
                              <span>Valor</span>
                              <strong>{formatPrice(ticket.pricePaid)}</strong>
                            </div>

                            <div>
                              <span>Asistente</span>
                              <strong>{ticket.attendeeName}</strong>
                            </div>

                            <div>
                              <span>Documento</span>
                              <strong>
                                {ticket.attendeeDocumentType}:{" "}
                                {ticket.attendeeDocumentNumber}
                              </strong>
                            </div>

                            <div>
                              <span>Compra</span>
                              <strong>{order?.buyOrder}</strong>
                            </div>
                          </div>

                          <div className="guestTicketCode">
                            <span>Código ticket</span>
                            <strong>{ticket.code}</strong>
                          </div>
                        </div>

                        <div className="guestTicketQr">
                          <img
                            src={getQrUrl(ticket.qrToken)}
                            alt="QR ticket"
                            crossOrigin="anonymous"
                          />
                          <span>Presenta este QR en el acceso</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="guestHelpGrid noPrint">
                <div>
                  <h3>Enviamos tus entradas al correo</h3>
                  <p>
                    <strong>{order?.buyerEmail}</strong>
                    <br />
                    Revisa tu bandeja de entrada y también spam.
                  </p>
                </div>

                <div>
                  <h3>¿Tienes problemas?</h3>
                  <p>
                    Escríbenos aL correo liverticket06@gmail.com o al WhatsApp +56922551661.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}