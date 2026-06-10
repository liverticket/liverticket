"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const ACCESS_DURATION_MS = 8 * 60 * 60 * 1000;

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

function getStoredScannerAccess(eventId) {
  if (typeof window === "undefined" || !eventId) return null;

  const rawValue = localStorage.getItem(`liverticket-scanner-${eventId}`);

  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed?.scannerCode || !parsed?.expiresAt) return null;

    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`liverticket-scanner-${eventId}`);
      return null;
    }

    return parsed.scannerCode;
  } catch {
    return null;
  }
}

function saveScannerAccess(eventId, scannerCode) {
  if (typeof window === "undefined" || !eventId) return;

  localStorage.setItem(
    `liverticket-scanner-${eventId}`,
    JSON.stringify({
      scannerCode,
      expiresAt: Date.now() + ACCESS_DURATION_MS,
    })
  );
}

export default function TicketValidationPage() {
  const params = useParams();

  const [ticket, setTicket] = useState(null);
  const [scannerCode, setScannerCode] = useState("");
  const [authorizedCode, setAuthorizedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
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

        const storedCode = getStoredScannerAccess(data.ticket.eventId);

        if (storedCode) {
          setAuthorizedCode(storedCode);
        }
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

  async function handleCheckin(codeToUse) {
    try {
      setCheckingIn(true);

      const res = await fetch(`/api/tickets/checkin/${params.qrToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scannerCode: codeToUse,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      saveScannerAccess(ticket.eventId, codeToUse);
      setAuthorizedCode(codeToUse);
      setMessage("✅ Ingreso registrado");

      setTicket((prev) => ({
        ...prev,
        status: "USED",
      }));
    } catch (error) {
      alert(error.message);
    } finally {
      setCheckingIn(false);
    }
  }

  function handleAuthorizeAndCheckin() {
    const cleanCode = scannerCode.trim();

    if (!cleanCode) {
      alert("Ingresa el código de acceso.");
      return;
    }

    handleCheckin(cleanCode);
  }

  if (loading) {
    return <h2>Cargando entrada...</h2>;
  }

  if (!ticket) {
    return <h2>{message}</h2>;
  }

  const canCheckin = ticket.status === "VALID";

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

      {canCheckin && !authorizedCode && (
        <div style={{ marginTop: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Código de acceso
          </label>

          <input
            value={scannerCode}
            onChange={(event) => setScannerCode(event.target.value)}
            placeholder="Ej: 9274"
            inputMode="numeric"
            maxLength={4}
            style={{
              width: "100%",
              maxWidth: 220,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 18,
              marginBottom: 12,
            }}
          />

          <br />

          <button
            onClick={handleAuthorizeAndCheckin}
            disabled={checkingIn}
            style={{
              padding: "12px 24px",
              border: 0,
              borderRadius: 8,
              background: "#16a34a",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {checkingIn ? "Validando..." : "Confirmar ingreso"}
          </button>
        </div>
      )}

      {canCheckin && authorizedCode && (
        <button
          onClick={() => handleCheckin(authorizedCode)}
          disabled={checkingIn}
          style={{
            padding: "12px 24px",
            border: 0,
            borderRadius: 8,
            background: "#16a34a",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
            marginTop: 20,
          }}
        >
          {checkingIn ? "Validando..." : "Confirmar ingreso"}
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