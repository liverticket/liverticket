"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import EventMap from "@/components/EventMap";

const categoryOptions = [
  "Concierto",
  "Festival",
  "Fiesta",
  "Tributo",
  "Stand Up",
  "Teatro",
  "Otro",
];

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
}

function createEditableTicket(ticket = {}) {
  return {
    id: ticket.id || `tmp-${Date.now()}-${Math.random()}`,
    name: ticket.name || "",
    description: ticket.description || "",
    price: String(ticket.price ?? ""),
    stock: ticket.stock == null ? "" : String(ticket.stock),
    unlimitedStock: Boolean(ticket.unlimitedStock),
  };
}

function createRequestDraft(request) {
  return {
    firstName: request.firstName || "",
    lastName: request.lastName || "",
    company: request.company || "",
    email: request.email || "",
    phone: request.phone || "",
    eventName: request.eventName || "",
    category: request.category || "",
    tentativeDate: formatDateInput(request.tentativeDate),
    minAge:
      request.minAge === null || request.minAge === undefined
        ? ""
        : String(request.minAge),
    eventTime: request.eventTime || "",
    region: request.region || "",
    city: request.city || "",
    venue: request.venue || "",
    address: request.address || "",
    message: request.message || "",
    ticketRequests: (request.ticketRequests || []).map((ticket) =>
      createEditableTicket(ticket)
    ),
  };
}

function createEventDraft(request) {
  const event = request.event;

  return {
    id: event.id,
    title: event.title || request.eventName || "",
    category: event.category?.name || request.category || "",
    date: formatDateInput(event.date),
    eventTime: event.eventTime || request.eventTime || "",
    venue: event.venue || request.venue || "",
    city: event.city || request.city || "",
    region: event.region || request.region || "",
    address: event.address || request.address || "",
    description: event.description || request.message || "",
    imageUrl: event.imageUrl || request.flyerUrl || "",
    minAge:
      event.minAge === null || event.minAge === undefined
        ? ""
        : String(event.minAge),
    visibility: event.visibility || "PUBLISHED",
    ticketTypes: (event.ticketTypes || []).map((ticket) =>
      createEditableTicket(ticket)
    ),
  };
}

function getWhatsAppUrl(request) {
  const rawDigits = String(request.phone || "").replace(/\D/g, "");
  if (!rawDigits) return "";

  const phoneDigits = rawDigits.startsWith("56") ? rawDigits : `56${rawDigits}`;
  const text = encodeURIComponent(
    `Hola ${request.firstName || ""}, te escribimos desde LiverTicket por tu solicitud "${request.eventName}".`
  );

  return `https://wa.me/${phoneDigits}?text=${text}`;
}

function getMailToUrl(request) {
  const subject = encodeURIComponent(
    `LiverTicket - Solicitud de evento: ${request.eventName}`
  );
  const body = encodeURIComponent(
    `Hola ${request.firstName || ""},\n\nTe contactamos desde LiverTicket por tu solicitud de evento "${request.eventName}".\n\nSaludos.`
  );

  return `mailto:${request.email}?subject=${subject}&body=${body}`;
}

function getAgeLabel(minAge) {
  const min = Number(minAge);

  if (Number.isFinite(min) && min > 0) {
    return `Desde ${min} años`;
  }

  return "Edad no especificada";
}

function getTimeLabel(eventTime) {
  if (!eventTime) return "Hora no especificada";
  return `${eventTime} hrs.`;
}

export default function AdminSolicitudesPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [actionLoadingId, setActionLoadingId] = useState("");
  const [editingRequestId, setEditingRequestId] = useState("");
  const [editingEventId, setEditingEventId] = useState("");

  const [requestDraft, setRequestDraft] = useState(null);
  const [eventDraft, setEventDraft] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [collapsedRequests, setCollapsedRequests] = useState({});

  async function loadRequests() {
    try {
      const res = await fetch("/api/admin/event-requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingCount = useMemo(() => {
    return requests.filter((request) => request.status === "PENDING").length;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const sortedRequests = [...requests].sort((a, b) => {
      const order = {
        PENDING: 0,
        APPROVED: 1,
        REJECTED: 2,
      };

      return order[a.status] - order[b.status];
    });

    return sortedRequests.filter((request) => {
      const isApproved = request.status === "APPROVED" && request.event;

      const title = isApproved
        ? request.event.title || ""
        : request.eventName || "";

      const venue = isApproved
        ? request.event.venue || request.event.location || ""
        : request.venue || "";

      const city = isApproved ? request.event.city || "" : request.city || "";
      const company = request.company || "";
      const contact = `${request.firstName || ""} ${request.lastName || ""}`;
      const email = request.email || "";

      const haystack = [
        title,
        venue,
        city,
        company,
        contact,
        email,
        request.category || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || haystack.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ? true : request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  async function handleApprove(id) {
    setActionLoadingId(id);

    try {
      const res = await fetch(`/api/admin/event-requests/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "No se pudo aprobar la solicitud.");
        return;
      }

      await loadRequests();
      setEditingRequestId("");
      setRequestDraft(null);
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al aprobar.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleReject(id) {
    setActionLoadingId(id);

    try {
      const res = await fetch(`/api/admin/event-requests/${id}/reject`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "No se pudo rechazar la solicitud.");
        return;
      }

      await loadRequests();
      setEditingRequestId("");
      setRequestDraft(null);
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al rechazar.");
    } finally {
      setActionLoadingId("");
    }
  }

  function startEditingRequest(request) {
    setEditingEventId("");
    setEventDraft(null);
    setEditingRequestId(request.id);
    setRequestDraft(createRequestDraft(request));

    setTimeout(() => {
      document
        .getElementById(`edit-request-${request.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  function cancelEditingRequest() {
    setEditingRequestId("");
    setRequestDraft(null);
  }

  function updateRequestField(field, value) {
    if (field === "minAge") {
      const onlyNumbers = String(value).replace(/\D/g, "").slice(0, 2);
      setRequestDraft((prev) => ({
        ...prev,
        [field]: onlyNumbers,
      }));
      return;
    }

    setRequestDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateRequestTicket(id, field, value) {
    setRequestDraft((prev) => ({
      ...prev,
      ticketRequests: prev.ticketRequests.map((ticket) => {
        if (ticket.id !== id) return ticket;

        if (field === "unlimitedStock") {
          return {
            ...ticket,
            unlimitedStock: value,
            stock: value ? "" : ticket.stock,
          };
        }

        return { ...ticket, [field]: value };
      }),
    }));
  }

  function addRequestTicket() {
    setRequestDraft((prev) => ({
      ...prev,
      ticketRequests: [...prev.ticketRequests, createEditableTicket()],
    }));
  }

  function removeRequestTicket(id) {
    setRequestDraft((prev) => ({
      ...prev,
      ticketRequests: prev.ticketRequests.filter((ticket) => ticket.id !== id),
    }));
  }

  async function saveRequest(requestId) {
    setActionLoadingId(requestId);

    try {
      const payload = {
        ...requestDraft,
        minAge: requestDraft.minAge ? Number(requestDraft.minAge) : null,
        eventTime: requestDraft.eventTime,
        ticketRequests: requestDraft.ticketRequests.map((ticket) => ({
          id: String(ticket.id || "").startsWith("tmp-") ? null : ticket.id,
          name: ticket.name,
          description: ticket.description,
          price: Number(ticket.price),
          stock: ticket.unlimitedStock ? null : Number(ticket.stock),
          unlimitedStock: Boolean(ticket.unlimitedStock),
        })),
      };

      const res = await fetch(`/api/admin/event-requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo actualizar la solicitud.");
        return;
      }

      await loadRequests();
      setEditingRequestId("");
      setRequestDraft(null);
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar la solicitud.");
    } finally {
      setActionLoadingId("");
    }
  }

  function startEditingEvent(request) {
    if (!request.event) return;

    setEditingRequestId("");
    setRequestDraft(null);
    setEditingEventId(request.event.id);
    setEventDraft(createEventDraft(request));

    setTimeout(() => {
      document
        .getElementById(`edit-event-${request.event.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  function cancelEditingEvent() {
    setEditingEventId("");
    setEventDraft(null);
  }

  function updateEventField(field, value) {
    if (field === "minAge") {
      const onlyNumbers = String(value).replace(/\D/g, "").slice(0, 2);
      setEventDraft((prev) => ({
        ...prev,
        [field]: onlyNumbers,
      }));
      return;
    }

    setEventDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateEventTicket(id, field, value) {
    setEventDraft((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.map((ticket) => {
        if (ticket.id !== id) return ticket;

        if (field === "unlimitedStock") {
          return {
            ...ticket,
            unlimitedStock: value,
            stock: value ? "" : ticket.stock,
          };
        }

        return { ...ticket, [field]: value };
      }),
    }));
  }

  function addEventTicket() {
    setEventDraft((prev) => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, createEditableTicket()],
    }));
  }

  function removeEventTicket(id) {
    setEventDraft((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((ticket) => ticket.id !== id),
    }));
  }

  async function saveEvent(eventId) {
    setActionLoadingId(eventId);

    try {
      const payload = {
        title: eventDraft.title,
        category: eventDraft.category,
        date: eventDraft.date,
        eventTime: eventDraft.eventTime,
        venue: eventDraft.venue,
        city: eventDraft.city,
        region: eventDraft.region,
        address: eventDraft.address,
        description: eventDraft.description,
        imageUrl: eventDraft.imageUrl,
        minAge: eventDraft.minAge ? Number(eventDraft.minAge) : null,
        ticketTypes: eventDraft.ticketTypes.map((ticket) => ({
          id: String(ticket.id || "").startsWith("tmp-") ? null : ticket.id,
          name: ticket.name,
          description: ticket.description,
          price: Number(ticket.price),
          stock: ticket.unlimitedStock ? null : Number(ticket.stock),
          unlimitedStock: Boolean(ticket.unlimitedStock),
        })),
      };

      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo actualizar el evento.");
        return;
      }

      await loadRequests();
      setEditingEventId("");
      setEventDraft(null);
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar el evento.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function toggleVisibility(eventId, currentVisibility) {
    const nextVisibility =
      currentVisibility === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    setActionLoadingId(eventId);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibility: nextVisibility }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo cambiar la visibilidad.");
        return;
      }

      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al cambiar la visibilidad.");
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <>
      <Navbar />

      <main className="ticketsPage">
        <div className="ticketsShell">
          <div className="ticketsHeader">
            <div>
              <p className="ticketsTag">ADMIN</p>
              <h1>Solicitudes de eventos</h1>
              <p className="ticketsSubtitle">
                Revisa, edita, aprueba, rechaza y administra los eventos de la
                cartelera.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 220px",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <input
              type="text"
              placeholder="Buscar por evento, productor, contacto, ciudad o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#15151a",
                color: "#fff",
                padding: "14px 16px",
                outline: "none",
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "#15151a",
                color: "#fff",
                padding: "14px 16px",
                outline: "none",
              }}
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendientes ({pendingCount})</option>
              <option value="APPROVED">Aprobados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>

          {loading ? (
            <div className="ticketsEmptyCard">
              <h1>Cargando solicitudes...</h1>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="ticketsEmptyCard">
              <h1>Sin resultados</h1>
              <p>No encontramos solicitudes con ese filtro.</p>
            </div>
          ) : (
            <div className="ticketsList">
              {filteredRequests.map((request) => {
                const whatsappUrl = getWhatsAppUrl(request);
                const mailtoUrl = getMailToUrl(request);

                const isApproved =
                  request.status === "APPROVED" && request.event;

                const displayTitle = isApproved
                  ? request.event.title
                  : request.eventName;

                const displayCategory = isApproved
                  ? request.event.category?.name || request.category
                  : request.category;

                const displayVenue = isApproved
                  ? request.event.venue ||
                    request.event.location ||
                    "Sin recinto"
                  : request.venue || "Sin recinto";

                const displayCity = isApproved
                  ? request.event.city || "Sin ciudad"
                  : request.city || "Sin ciudad";

                const displayMessage = isApproved
                  ? request.event.description || request.message
                  : request.message;

                const displayImage = isApproved
                  ? request.event.imageUrl || request.flyerUrl
                  : request.flyerUrl;

                const displayAddress = isApproved
                  ? request.event.address
                  : request.address;

                const displayRegion = isApproved
                  ? request.event.region
                  : request.region;

                const displayMinAge = isApproved
                  ? request.event.minAge
                  : request.minAge;

                const displayEventTime = isApproved
                  ? request.event.eventTime
                  : request.eventTime;

                const displayTickets = isApproved
                  ? request.event.ticketTypes || []
                  : request.ticketRequests || [];
                  
                const isCollapsed =
                  request.status !== "PENDING" &&
                  !collapsedRequests[request.id];

                return (
                  <div key={request.id} className="ticketCard">
                    {request.status !== "PENDING" && (
                      <div
                        onClick={() =>
                          setCollapsedRequests((prev) => ({
                            ...prev,
                            [request.id]: !prev[request.id],
                          }))
                        }
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          padding: "18px 24px",
                        }}
                      >
                        <strong>{displayTitle}</strong>

                        <span style={{ fontSize: 22 }}>
                          {isCollapsed ? "▼" : "▲"}
                        </span>
                      </div>
                    )}

                    {isCollapsed ? null : (
                      <div className="ticketInfo">
                        <div className="ticketTopRow">
                          <span className="ticketType">{displayCategory}</span>

                        <span
                          className={`ticketStatus ${
                            request.status === "PENDING"
                              ? "statusVigente"
                              : request.status === "APPROVED"
                              ? "statusValidado"
                              : "statusExpirado"
                          }`}
                        >
                          {request.status}
                        </span>

                        {request.event ? (
                          <span className="ticketType">
                            {request.event.visibility === "PUBLISHED"
                              ? "En cartelera"
                              : "Oculto"}
                          </span>
                        ) : null}
                      </div>

                      <h2>{displayTitle}</h2>

                      <p className="ticketPlace">
                        {displayCity} · {displayVenue}
                      </p>

                      <div className="ticketMeta" style={{ marginTop: 16 }}>
                        <div>
                          <span className="ticketMetaLabel">
                            Edad permitida
                          </span>
                          <strong>{getAgeLabel(displayMinAge)}</strong>
                        </div>

                        <div>
                          <span className="ticketMetaLabel">
                            Hora del evento
                          </span>
                          <strong>{getTimeLabel(displayEventTime)}</strong>
                        </div>

                        <div>
                          <span className="ticketMetaLabel">Productora</span>
                          <strong>{request.company}</strong>
                        </div>

                        <div>
                          <span className="ticketMetaLabel">Contacto</span>
                          <strong>
                            {request.firstName} {request.lastName}
                          </strong>
                        </div>

                        <div>
                          <span className="ticketMetaLabel">Correo</span>
                          <strong>{request.email}</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <span className="ticketMetaLabel">Teléfono</span>
                        <p style={{ margin: "6px 0 0", color: "#444" }}>
                          {request.phone || "Sin teléfono"}
                        </p>
                      </div>

                      <div style={{ marginTop: 16 }}>
                        <span className="ticketMetaLabel">Mensaje</span>
                        <p
                          style={{
                            color: "#444",
                            lineHeight: 1.6,
                            marginTop: 8,
                          }}
                        >
                          {displayMessage}
                        </p>
                      </div>

                      <div style={{ marginTop: 24 }}>
                        <span className="ticketMetaLabel">Tipos de entrada</span>

                        {displayTickets.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                              marginTop: 12,
                            }}
                          >
                            {displayTickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                style={{
                                  border: "1px solid #e6e6e6",
                                  borderRadius: 14,
                                  padding: 14,
                                  background: "#fafafa",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 16,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div>
                                    <strong
                                      style={{
                                        color: "#111",
                                        fontSize: "16px",
                                        display: "block",
                                        marginBottom: 6,
                                      }}
                                    >
                                      {ticket.name}
                                    </strong>

                                    <p
                                      style={{
                                        margin: 0,
                                        color: ticket.description
                                          ? "#666"
                                          : "#999",
                                        lineHeight: 1.5,
                                        fontStyle: ticket.description
                                          ? "normal"
                                          : "italic",
                                      }}
                                    >
                                      {ticket.description || "Sin descripción"}
                                    </p>
                                  </div>

                                  <div
                                    style={{
                                      textAlign: "right",
                                      minWidth: "150px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: 800,
                                        color: "#111",
                                        fontSize: "17px",
                                      }}
                                    >
                                      {formatPrice(ticket.price)}
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 4,
                                        color: "#666",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {ticket.unlimitedStock
                                        ? "Stock ilimitado"
                                        : `Stock: ${ticket.stock}`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: "#888", marginTop: 10 }}>
                            Esta solicitud no tiene tipos de entrada
                            configurados.
                          </p>
                        )}
                      </div>

                      {displayImage ? (
                        <div style={{ marginTop: 20 }}>
                          <span className="ticketMetaLabel">Flyer</span>
                          <div style={{ marginTop: 10 }}>
                            <img
                              src={displayImage}
                              alt={displayTitle}
                              style={{
                                width: 260,
                                maxWidth: "100%",
                                borderRadius: 14,
                                border: "1px solid #ddd",
                                display: "block",
                              }}
                            />
                          </div>
                        </div>
                      ) : null}

                      <div style={{ marginTop: 24 }}>
                        <span className="ticketMetaLabel">Ubicación</span>

                        <p
                          style={{
                            color: "#888",
                            marginTop: 6,
                            fontSize: "0.95rem",
                          }}
                        >
                          {[displayAddress, displayCity, displayRegion]
                            .filter(Boolean)
                            .join(", ")}
                        </p>

                        <div style={{ marginTop: 12 }}>
                          <EventMap
                            address={displayAddress}
                            city={displayCity}
                            region={displayRegion}
                            height={240}
                          />
                        </div>
                      </div>

                      <div
                        className="profileActions"
                        style={{
                          marginTop: 24,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        {request.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => startEditingRequest(request)}
                            >
                              Editar solicitud
                            </button>

                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoadingId === request.id}
                            >
                              {actionLoadingId === request.id
                                ? "Procesando..."
                                : "Aprobar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReject(request.id)}
                              disabled={actionLoadingId === request.id}
                              style={{
                                background: "#ffffff",
                                color: "#111111",
                                border: "1px solid #d0d0d0",
                                borderRadius: "12px",
                                padding: "12px 18px",
                                fontWeight: 700,
                                cursor: "pointer",
                                minWidth: "140px",
                              }}
                            >
                              {actionLoadingId === request.id
                                ? "Procesando..."
                                : "Rechazar"}
                            </button>
                          </>
                        ) : null}

                        {isApproved ? (
                          <>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => startEditingEvent(request)}
                            >
                              Editar evento
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleVisibility(
                                  request.event.id,
                                  request.event.visibility
                                )
                              }
                              disabled={actionLoadingId === request.event.id}
                              style={{
                                background: "#ffffff",
                                color: "#111111",
                                border: "1px solid #d0d0d0",
                                borderRadius: "12px",
                                padding: "12px 18px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {actionLoadingId === request.event.id
                                ? "Procesando..."
                                : request.event.visibility === "PUBLISHED"
                                ? "Quitar de cartelera"
                                : "Publicar en cartelera"}
                            </button>
                          </>
                        ) : null}

                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btnLight"
                          >
                            WhatsApp
                          </a>
                        ) : null}

                        <a href={mailtoUrl} className="btn btnLight">
                          Correo
                        </a>
                      </div>

                      {editingRequestId === request.id && requestDraft ? (
                        <div
                          id={`edit-request-${request.id}`}
                          style={{
                            marginTop: 26,
                            borderTop: "1px solid #ddd",
                            paddingTop: 22,
                            scrollMarginTop: 120,
                          }}
                        >
                          <h3 style={{ marginBottom: 16 }}>
                            Editar solicitud pendiente
                          </h3>

                          <div className="formGrid">
                            <div className="field">
                              <label>Nombre</label>
                              <input
                                value={requestDraft.firstName}
                                onChange={(e) =>
                                  updateRequestField(
                                    "firstName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Apellido</label>
                              <input
                                value={requestDraft.lastName}
                                onChange={(e) =>
                                  updateRequestField(
                                    "lastName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Empresa / Productora</label>
                              <input
                                value={requestDraft.company}
                                onChange={(e) =>
                                  updateRequestField("company", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Correo</label>
                              <input
                                type="email"
                                value={requestDraft.email}
                                onChange={(e) =>
                                  updateRequestField("email", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Teléfono</label>
                              <input
                                value={requestDraft.phone}
                                onChange={(e) =>
                                  updateRequestField("phone", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Nombre del evento</label>
                              <input
                                value={requestDraft.eventName}
                                onChange={(e) =>
                                  updateRequestField(
                                    "eventName",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Categoría</label>
                              <select
                                value={requestDraft.category}
                                onChange={(e) =>
                                  updateRequestField("category", e.target.value)
                                }
                              >
                                <option value="">Selecciona</option>
                                {categoryOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label>Fecha tentativa</label>
                              <input
                                type="date"
                                value={requestDraft.tentativeDate}
                                onChange={(e) =>
                                  updateRequestField(
                                    "tentativeDate",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Hora del evento</label>
                              <input
                                type="time"
                                value={requestDraft.eventTime}
                                onChange={(e) =>
                                  updateRequestField(
                                    "eventTime",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Edad mínima</label>
                              <input
                                value={requestDraft.minAge}
                                onChange={(e) =>
                                  updateRequestField("minAge", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Región</label>
                              <input
                                value={requestDraft.region}
                                onChange={(e) =>
                                  updateRequestField("region", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Ciudad / Comuna</label>
                              <input
                                value={requestDraft.city}
                                onChange={(e) =>
                                  updateRequestField("city", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Venue / Lugar</label>
                              <input
                                value={requestDraft.venue}
                                onChange={(e) =>
                                  updateRequestField("venue", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Dirección</label>
                              <input
                                value={requestDraft.address}
                                onChange={(e) =>
                                  updateRequestField("address", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Mensaje</label>
                              <textarea
                                rows="4"
                                value={requestDraft.message}
                                onChange={(e) =>
                                  updateRequestField("message", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <TicketEditor
                            tickets={requestDraft.ticketRequests}
                            onAdd={addRequestTicket}
                            onRemove={removeRequestTicket}
                            onChange={updateRequestTicket}
                          />

                          <div
                            style={{
                              marginTop: 18,
                              display: "flex",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => saveRequest(request.id)}
                              disabled={actionLoadingId === request.id}
                            >
                              {actionLoadingId === request.id
                                ? "Guardando..."
                                : "Guardar solicitud"}
                            </button>

                            <button
                              type="button"
                              className="btnGhostDark"
                              onClick={cancelEditingRequest}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {request.event &&
                      editingEventId === request.event.id &&
                      eventDraft ? (
                        <div
                          id={`edit-event-${request.event.id}`}
                          style={{
                            marginTop: 26,
                            borderTop: "1px solid #ddd",
                            paddingTop: 22,
                            scrollMarginTop: 120,
                          }}
                        >
                          <h3 style={{ marginBottom: 16 }}>
                            Editar evento publicado
                          </h3>

                          <div className="formGrid">
                            <div className="field fieldFull">
                              <label>Título</label>
                              <input
                                value={eventDraft.title}
                                onChange={(e) =>
                                  updateEventField("title", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Categoría</label>
                              <select
                                value={eventDraft.category}
                                onChange={(e) =>
                                  updateEventField("category", e.target.value)
                                }
                              >
                                <option value="">Selecciona</option>
                                {categoryOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="field">
                              <label>Fecha</label>
                              <input
                                type="date"
                                value={eventDraft.date}
                                onChange={(e) =>
                                  updateEventField("date", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Hora del evento</label>
                              <input
                                type="time"
                                value={eventDraft.eventTime}
                                onChange={(e) =>
                                  updateEventField("eventTime", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Edad mínima</label>
                              <input
                                value={eventDraft.minAge}
                                onChange={(e) =>
                                  updateEventField("minAge", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Image URL</label>
                              <input
                                value={eventDraft.imageUrl}
                                onChange={(e) =>
                                  updateEventField("imageUrl", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Venue / Lugar</label>
                              <input
                                value={eventDraft.venue}
                                onChange={(e) =>
                                  updateEventField("venue", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Ciudad</label>
                              <input
                                value={eventDraft.city}
                                onChange={(e) =>
                                  updateEventField("city", e.target.value)
                                }
                              />
                            </div>

                            <div className="field">
                              <label>Región</label>
                              <input
                                value={eventDraft.region}
                                onChange={(e) =>
                                  updateEventField("region", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Dirección</label>
                              <input
                                value={eventDraft.address}
                                onChange={(e) =>
                                  updateEventField("address", e.target.value)
                                }
                              />
                            </div>

                            <div className="field fieldFull">
                              <label>Descripción</label>
                              <textarea
                                rows="4"
                                value={eventDraft.description}
                                onChange={(e) =>
                                  updateEventField(
                                    "description",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <TicketEditor
                            tickets={eventDraft.ticketTypes}
                            onAdd={addEventTicket}
                            onRemove={removeEventTicket}
                            onChange={updateEventTicket}
                          />

                          <div
                            style={{
                              marginTop: 18,
                              display: "flex",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => saveEvent(request.event.id)}
                              disabled={actionLoadingId === request.event.id}
                            >
                              {actionLoadingId === request.event.id
                                ? "Guardando..."
                                : "Guardar evento"}
                            </button>

                            <button
                              type="button"
                              className="btnGhostDark"
                              onClick={cancelEditingEvent}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TicketEditor({ tickets, onAdd, onRemove, onChange }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span className="ticketMetaLabel">Tipos de entrada</span>

        <button type="button" className="btnGhostDark" onClick={onAdd}>
          + Agregar ticket
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={{
              border: "1px solid #e4e4e4",
              borderRadius: 14,
              padding: 14,
              background: "#fafafa",
            }}
          >
            <div className="formGrid">
              <div className="field">
                <label>Nombre</label>
                <input
                  value={ticket.name}
                  onChange={(e) => onChange(ticket.id, "name", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Precio</label>
                <input
                  type="number"
                  min="0"
                  value={ticket.price}
                  onChange={(e) => onChange(ticket.id, "price", e.target.value)}
                />
              </div>

              <div className="field fieldFull">
                <label style={{ display: "block", marginBottom: 8 }}>
                  Stock
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  {!ticket.unlimitedStock ? (
                    <input
                      type="number"
                      min="1"
                      placeholder="Ej: 100"
                      value={ticket.stock}
                      onChange={(e) =>
                        onChange(ticket.id, "stock", e.target.value)
                      }
                    />
                  ) : (
                    <div
                      style={{
                        padding: "14px 15px",
                        borderRadius: 12,
                        border: "1px solid #dcdcdc",
                        background: "#f3f3f3",
                        color: "#555",
                        fontWeight: 600,
                      }}
                    >
                      Sin límite de stock
                    </div>
                  )}

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 600,
                      color: "#111",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ticket.unlimitedStock}
                      onChange={(e) =>
                        onChange(
                          ticket.id,
                          "unlimitedStock",
                          e.target.checked
                        )
                      }
                    />
                    Stock ilimitado
                  </label>
                </div>
              </div>

              <div className="field fieldFull">
                <label>Descripción</label>
                <textarea
                  rows="3"
                  value={ticket.description}
                  onChange={(e) =>
                    onChange(ticket.id, "description", e.target.value)
                  }
                />
              </div>
            </div>

            {tickets.length > 1 ? (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => onRemove(ticket.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#c4151f",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Eliminar ticket
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}