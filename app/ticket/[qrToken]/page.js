"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function getStatusLabel(status) {
  switch (status) {
    case "VALID":
      return "Válida";
    case "USED":
      return "Utilizada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status || "Sin estado";
  }
}

export default function TicketValidationPage() {
  const params = useParams();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadTicket() {
      try {
        const res = await fetch(`/api/tickets/validate/${params.qrToken}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message);
        }

        setTicket(data.ticket);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.qrToken) {
      loadTicket();
    }
  }, [params.qrToken]);

  async function handleCheckin() {
    try {
      const res = await fetch(`/api/tickets/checkin/${params.qrToken}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      setMessage("✅ Ingreso registrado");

      setTicket((prev) => ({
        ...prev,
        status: "USED",
      }));
    } catch (error) {
      alert(error.message);
    }
  }

  if (loading) {
    return <h2>Cargando entrada...</h2>;
  }

  if (!ticket) {
    return <h2>{message}</h2>;
  }

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "50px auto",
        padding: 24,
      }}
    >
      <h1>{ticket.event.title}</h1>

      <p>
        <strong>Asistente:</strong> {ticket.attendeeName}
      </p>

      <p>
        <strong>Documento:</strong> {ticket.attendeeDocumentNumber}
      </p>

      <p>
        <strong>Tipo:</strong> {ticket.ticketType.name}
      </p>

      <p>
        <strong>Estado:</strong> {getStatusLabel(ticket.status)}
      </p>

      {ticket.status === "VALID" && (
        <button
          onClick={handleCheckin}
          style={{
            padding: "12px 24px",
            border: 0,
            borderRadius: 8,
            background: "#16a34a",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Confirmar ingreso
        </button>
      )}

      {ticket.status === "USED" && (
        <h2 style={{ color: "red" }}>
          ESTA ENTRADA YA FUE UTILIZADA
        </h2>
      )}

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}