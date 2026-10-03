"use client";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import styles from "./entradas.module.css";
const labels = { VALID: "Válida", USED: "Usada", CANCELLED: "Anulada" };
const eligible = ticket => ticket.status === "VALID" && ticket.order.status === "PAID";
export default function AdminTickets() {
  const [data, setData] = useState({ tickets: [], total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState({});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/admin/tickets?q=${encodeURIComponent(query)}&page=${page}`, { cache: "no-store", signal: controller.signal })
      .then(async res => { const body = await res.json(); if (!res.ok) throw new Error(body.error); return body; })
      .then(setData)
      .catch(err => { if (err.name !== "AbortError") setError(err.message || "No se pudieron cargar las entradas."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, refresh]);
  function toggle(ticket) {
    setSelected(prev => { const next = { ...prev }; if (next[ticket.id]) delete next[ticket.id]; else if (Object.keys(next).length < 50) next[ticket.id] = ticket; return next; });
    setMessage("");
  }
  async function send(event) {
    event.preventDefault();
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/admin/tickets/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ticketIds: Object.keys(selected) }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setMessage(result.message); setSelected({});
    } catch (err) { setError(err.message || "No se pudo confirmar el envío."); }
    finally { sendingRef.current = false; setSending(false); }
  }
  const selection = Object.values(selected);
  const visible = data.tickets.filter(eligible);
  return <><Navbar /><main className={styles.main}>
    <h1>Entradas</h1><p>Consulta todas las entradas, incluidas las compras de invitados, y reenvía sus QR originales.</p>
    <form className={styles.controls} onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setPage(1); setRefresh(n => n + 1); }}>
      <label className={styles.search}>Buscar por asistente, correo, evento o compra<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Por ejemplo: Rodrigo Rojo" maxLength={150} /></label>
      <button disabled={sending}>Buscar</button><button type="button" disabled={sending} onClick={() => setRefresh(n => n + 1)}>Actualizar</button>
    </form>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.success}>{message} El servidor de correo aceptó el envío; la llegada a la bandeja depende del proveedor.</p>}
    <section className={styles.panel} aria-label="Reenviar entradas">
      <h2>Reenviar {selection.length} entradas seleccionadas</h2>
      <p>Solo puedes seleccionar entradas válidas de compras pagadas. Máximo 50 por envío.</p>
      {selection.length > 0 && <><ul>{selection.map(t => <li key={t.id}>{t.attendeeName} · {t.event.title} <button type="button" disabled={sending} onClick={() => toggle(t)} aria-label={`Quitar ${t.attendeeName}`}>Quitar</button></li>)}</ul><button type="button" disabled={sending} onClick={() => setSelected({})}>Limpiar selección</button></>}
      <form className={styles.controls} onSubmit={send}>
        <label className={styles.search}>Correo destinatario<input type="email" required maxLength={254} value={email} disabled={sending} onChange={e => { setEmail(e.target.value); setMessage(""); }} placeholder="correo@ejemplo.com" /></label>
        <button disabled={sending || !selection.length || !email.trim()}>{sending ? "Enviando…" : "Enviar entradas"}</button>
      </form>
      <p>El envío no cambia el correo registrado de la compra.</p>
    </section>
    <p>{data.total} entradas encontradas · Página {page} de {data.pages}</p>
    <button disabled={loading || sending || !visible.length} onClick={() => setSelected(prev => { const next = { ...prev }; for (const t of visible) { if (Object.keys(next).length >= 50) break; next[t.id] = t; } return next; })}>Seleccionar válidas de esta página</button>
    {loading ? <p role="status">Cargando entradas…</p> : error ? null : <div className={styles.table}><table><thead><tr><th>Seleccionar</th><th>Asistente / código</th><th>Evento / tipo</th><th>Compra / correo</th><th>Estado</th><th>Fecha de emisión</th></tr></thead><tbody>
      {data.tickets.map(t => <tr key={t.id}><td><input type="checkbox" aria-label={`Seleccionar entrada de ${t.attendeeName}, ${t.code}`} checked={Boolean(selected[t.id])} disabled={sending || !eligible(t) || (!selected[t.id] && selection.length >= 50)} onChange={() => toggle(t)} /></td><td>{t.attendeeName}<small>{t.code}</small></td><td>{t.event.title}<small>{t.ticketType.name}</small></td><td>{t.order.buyOrder}<small>{t.order.user?.email || t.order.buyerEmail || "Sin correo"}</small><small>{t.order.userId ? "Usuario registrado" : "Invitado"}</small></td><td>{labels[t.status] || t.status}<small>{t.order.status === "PAID" ? "Pagada" : "Compra sin pago confirmado"}</small></td><td>{new Date(t.createdAt).toLocaleString("es-CL", { timeZone: "America/Santiago" })}</td></tr>)}
      {!data.tickets.length && <tr><td colSpan={6}>No hay entradas para esta búsqueda.</td></tr>}
    </tbody></table></div>}
    <div className={styles.controls}><button disabled={loading || sending || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><button disabled={loading || sending || page >= data.pages} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
  </main></>;
}
