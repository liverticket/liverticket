"use client";

import { useRef, useState } from "react";

export default function DeleteEventButton({ eventId, requestId, title, disabled, onDeleted }) {
  const busy = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy.current || disabled) return;
    if (!window.confirm(`¿Eliminar el evento «${title}»? Se eliminarán también su solicitud y entradas no vendidas. Esta acción no se puede deshacer. Si tiene órdenes, pagos o tickets, la eliminación será bloqueada.`)) return;
    busy.current = true;
    setDeleting(true);
    setError("");
    try {
      const url = eventId ? `/api/admin/events/${eventId}` : `/api/admin/event-requests/${requestId}`;
      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo eliminar el evento.");
      onDeleted(data);
    } catch (error) {
      setError(error.message || "No se pudo eliminar el evento. Revisa tu conexión.");
    } finally {
      busy.current = false;
      setDeleting(false);
    }
  }

  return (
    <div className="deleteEventAction">
      <button type="button" className="btn btnDeleteEvent" disabled={disabled || deleting} onClick={remove}>
        {deleting ? "Eliminando..." : "Eliminar evento"}
      </button>
      {error ? <p role="alert" className="deleteEventError">{error}</p> : null}
    </div>
  );
}
