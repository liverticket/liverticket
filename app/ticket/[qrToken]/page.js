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

function getStoredScannerAccess(qrToken) {
  if (typeof window === "undefined" || !qrToken) return null;

  const rawValue = localStorage.getItem(`liverticket-scanner-ticket-${qrToken}`);

  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed?.scannerCode || !parsed?.expiresAt) return null;

    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`liverticket-scanner-ticket-${qrToken}`);
      return null;
    }

    return parsed.scannerCode;
  } catch {
    return null;
  }
}

function saveScannerAccess(qrToken, scannerCode) {
  if (typeof window === "undefined" || !qrToken) return;

  localStorage.setItem(
    `liverticket-scanner-ticket-${qrToken}`,
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
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState("");

  async function verifyAccess(codeToUse) {
    try {
      setCheckingAccess(true);
      setMessage("");

      const res = await fetch(`/api/tickets/access/${params.qrToken}`, {
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

      saveScannerAccess(params.qrToken, codeToUse);
      setAuthorizedCode(codeToUse);
      setTicket(data.ticket);
    } catch (error) {
      setMessage(error.message);
      setTicket(null);
      setAuthorizedCode("");
    } finally {
      setLoading(false);
      setCheckingAccess(false);
    }
  }

  useEffect(() => {
    const storedCode = getStoredScannerAccess(params.qrToken);

    if (storedCode) {
      verifyAccess(storedCode);
    } else {
      setLoading(false);
    }
  }, [params.qrToken]);

  async function handleCheckin() {
    try {
      setCheckingIn(true);

      const res = await fetch(`/api/tickets/checkin/${params.qrToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scannerCode: authorizedCode,
        }),
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
    } finally {
      setCheckingIn(false);
    }
  }

  function handleAuthorize() {
    const cleanCode = scannerCode.trim();

    if (!cleanCode) {
      setMessage("Ingresa el código de acceso.");
      return;
    }

    verifyAccess(cleanCode);
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 700, margin: "50px auto", padding: 24 }}>
        <h2>Cargando entrada...</h2>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main style={{ maxWidth: 700, margin: "50px auto", padding: 24 }}>
        <h1>Control de acceso</h1>

        <p>Ingresa el código del evento para ver y validar esta entrada.</p>

        <label
          style={{
            display: "block",
            marginTop: 20,
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
          onClick={handleAuthorize}
          disabled={checkingAccess}
          style={{
            padding: "12px 24px",
            border: 0,
            borderRadius: 8,
            background: "#111111",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          {checkingAccess ? "Verificando..." : "Verificar acceso"}
        </button>

        {message && <p style={{ marginTop: 20 }}>{message}</p>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 700, margin: "50px auto", padding: 24 }}>
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
      )}

      {ticket.status === "USED" && (
        <h2 style={{ color: "red" }}>ESTA ENTRADA YA FUE UTILIZADA</h2>
      )}

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}