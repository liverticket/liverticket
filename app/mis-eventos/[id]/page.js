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

  const subtotal = event?.totalSales || 0;
  const serviceFee = Math.round(subtotal * 0.1);
  const producerTotal = subtotal - serviceFee;

  const allAttendees = event?.attendees || [];

  const usedAttendees =
    allAttendees.filter((attendee) =>
      ["USED", "SCANNED", "CHECKED_IN"].includes(attendee.status)
    ) || [];

  const excelAvailableUntil = event?.date
    ? new Date(event.date)
    : null;

  if (excelAvailableUntil) {
    excelAvailableUntil.setDate(excelAvailableUntil.getDate() + 1);
  }

  const canDownloadExcel =
    excelAvailableUntil && new Date() <= excelAvailableUntil;

  function handleDownloadAttendeesExcel() {
    const rows = [...allAttendees]
      .sort((a, b) =>
        (a.attendeeName || "").localeCompare(b.attendeeName || "", "es", {
          sensitivity: "base",
        })
      )
      .map((attendee) => ({
        Nombre: attendee.attendeeName || "",
        "Nº Documento": attendee.attendeeDocumentNumber || "",
        Tipo: attendee.ticketType || "",
      }));

    const tableRows = rows
      .map(
        (row) => `
          <tr>
            <td>${row.Nombre}</td>
            <td>${row["Nº Documento"]}</td>
            <td>${row.Tipo}</td>
          </tr>
        `
      )
      .join("");

    const excelContent = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Nº Documento</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelContent], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `lista-entradas-${event.title || "evento"}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <Navbar />

      <section className="myEventDetailPage">
        <div className="container">
          

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
                <span className="myEventStatus status-PUBLISHED">
                  Publicado
                </span>

                <h1>{event.title}</h1>
              </div>

              <div className="myEventDashboardRow">
                <div className="myEventDetailBlock myEventSalesBlock">
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
                  </div>

                  <div className="myEventSalesSummary">
                    <div>
                      <span>Subtotal ventas</span>
                      <strong>{formatMoney(subtotal)}</strong>
                    </div>

                    <div>
                      <span>Comisión LiverTicket 10%</span>
                      <strong>-{formatMoney(serviceFee)}</strong>
                    </div>

                    <div className="final">
                      <span>Total a pagar al productor</span>
                      <strong>{formatMoney(producerTotal)}</strong>
                    </div>
                  </div>
                </div>

                <div className="myEventRightColumn">
                  <div className="myEventAttendeesCard">
                    <span>Entradas usadas</span>
                    <strong>{usedAttendees.length}</strong>
                    <p>personas asistieron al evento</p>
                  </div>

                  <button
                    type="button"
                    className="myEventExcelButton"
                    onClick={handleDownloadAttendeesExcel}
                    disabled={!canDownloadExcel || allAttendees.length === 0}
                  >
                    {canDownloadExcel
                      ? "Descargar excel con lista de entradas"
                      : "Excel no disponible"}
                  </button>
                  <p className="myEventExcelNote">
                    Excel disponible hasta 1 día después del evento.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}