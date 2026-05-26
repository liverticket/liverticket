"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventMap from "@/components/EventMap";

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

function formatEventTime(eventTime) {
  if (!eventTime) return "Hora por confirmar";
  return `${eventTime} hrs`;
}

function cleanRut(value) {
  return String(value || "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .trim();
}

function formatRut(value) {
  const clean = cleanRut(value);
  if (clean.length < 2) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  return `${body}-${dv}`;
}

function isValidChileanRut(value) {
  const rut = formatRut(value);

  if (!/^\d{7,8}-[0-9K]$/.test(rut)) return false;

  const [body, dv] = rut.split("-");
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);

  return expectedDv === dv;
}

function normalizeDocumentNumber(value) {
  return String(value || "").trim();
}

export default function EventoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id;

  const [loading, setLoading] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [evento, setEvento] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);

  const [attendeeName, setAttendeeName] = useState("");
  const [documentType, setDocumentType] = useState("RUT");
  const [documentNumber, setDocumentNumber] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  async function loadCart() {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const data = await res.json();

      if (res.ok) {
        setCartItems(Array.isArray(data.cartItems) ? data.cartItems : []);
      } else {
        setCartItems([]);
      }
    } catch {
      setCartItems([]);
    }
  }

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await res.json();
        const user = data.user || null;

        setCurrentUser(user);

        if (user?.id) {
          await loadCart();
        } else {
          setCartItems([]);
        }
      } catch {
        setCurrentUser(null);
        setCartItems([]);
      } finally {
        setIsLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/events/${eventId}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok && data.event) {
          setEvento(data.event);
        } else {
          setEvento(null);
        }
      } catch (error) {
        console.error("Error cargando evento:", error);
        setEvento(null);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  const ticketTypes = Array.isArray(evento?.ticketTypes)
    ? evento.ticketTypes
    : [];

  const selectedTicket = useMemo(() => {
    return ticketTypes.find((ticket) => ticket.id === selectedTicketId) || null;
  }, [ticketTypes, selectedTicketId]);

  const eventCartItems = useMemo(() => {
    return cartItems.filter((item) => item.eventId === eventId);
  }, [cartItems, eventId]);

  const fullAddress = evento
    ? [evento.address, evento.city, evento.region].filter(Boolean).join(", ")
    : "";

  const subtotal = eventCartItems.reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const total = subtotal;

  function resetAttendeeData() {
    setAttendeeName("");
    setDocumentType("RUT");
    setDocumentNumber("");
  }

  function handleSelectTicket(ticketId) {
    setSelectedTicketId(ticketId);
    setShowAttendeeForm(true);

    setTimeout(() => {
      document
        .getElementById("datos-asistente")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleAddToCart() {
    if (!currentUser?.id) {
      router.push(
        `/ingresar?redirect=${encodeURIComponent(`/evento/${eventId}`)}`
      );
      return;
    }

    if (!evento || !selectedTicket) {
      alert("Debes seleccionar un tipo de entrada.");
      return;
    }

    const cleanName = attendeeName.trim();
    const cleanDocumentType = String(documentType || "").trim();

    const cleanDocumentNumber =
      cleanDocumentType === "RUT"
        ? formatRut(documentNumber)
        : normalizeDocumentNumber(documentNumber);

    if (!cleanName || !cleanDocumentType || !cleanDocumentNumber) {
      alert(
        "Debes completar nombre completo, tipo de documento y número de documento."
      );
      return;
    }

    if (
      cleanDocumentType === "RUT" &&
      !isValidChileanRut(cleanDocumentNumber)
    ) {
      alert("Debes ingresar un RUT válido.");
      return;
    }

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId: evento.id,
        ticketTypeId: selectedTicket.id,
        quantity: 1,
        attendeeName: cleanName,
        attendeeDocumentType: cleanDocumentType,
        attendeeDocumentNumber: cleanDocumentNumber,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "No se pudo agregar la entrada al carrito.");
      return;
    }

    await loadCart();
    window.dispatchEvent(new Event("liverticket-cart-updated"));

    resetAttendeeData();
    setShowAttendeeForm(false);
    setSelectedTicketId("");

    setTimeout(() => {
      document
        .getElementById("resumen-compra")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleRemoveItem(cartItemId) {
    const res = await fetch(`/api/cart/${cartItemId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("No se pudo quitar la entrada.");
      return;
    }

    await loadCart();
    window.dispatchEvent(new Event("liverticket-cart-updated"));
  }

  async function handleContinueToPayment() {
    if (!currentUser?.id) {
      router.push(
        `/ingresar?redirect=${encodeURIComponent(`/evento/${eventId}`)}`
      );
      return;
    }

    if (eventCartItems.length === 0) {
      alert("Primero debes añadir al menos una entrada al carrito.");
      return;
    }

    try {
      setIsPaying(true);

      const res = await fetch("/api/webpay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cartItems: eventCartItems }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo iniciar el pago con Webpay.");
        return;
      }

      if (!data.url || !data.token) {
        alert("No se pudo iniciar el pago con Webpay.");
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "token_ws";
      input.value = data.token;

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al conectar con Webpay.");
    } finally {
      setIsPaying(false);
    }
  }

  if (loading || isLoadingUser) {
    return (
      <>
        <Navbar />
        <main className="section">
          <div className="container simpleBox">
            <h1>Cargando evento...</h1>
            <p>Estamos preparando la información.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!evento) {
    return (
      <>
        <Navbar />
        <main className="section">
          <div className="container simpleBox">
            <h1>Evento no encontrado</h1>
            <p>No pudimos cargar la información de este evento.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="section eventDetailSection">
        <div className="container eventDetailContainer">
          <Link href="/" className="eventBackLink">
            ← Volver a la cartelera
          </Link>

          <section className="eventDetailMainCard">
            <div className="eventDetailLeft">
              <img
                src={evento.imageUrl || "/placeholder-event.jpg"}
                alt={evento.title || "Evento"}
                className="eventImageLarge"
              />

              <div className="eventInfoBlock">
                <span className="eventDetailBadge">
                  {evento.category?.name || "Evento"}
                </span>

                <h1 className="eventMainTitle">
                  {evento.title || "Sin título"}
                </h1>

                <div className="eventDetailMetaCompact">
                  <div>
                    <span>Fecha</span>
                    <strong>{formatDate(evento.date)}</strong>
                  </div>

                  <div>
                    <span>Hora</span>
                    <strong>{formatEventTime(evento.eventTime)}</strong>
                  </div>

                  <div className="wide">
                    <span>Lugar</span>
                    <strong>
                      {evento.venue || evento.location || "Lugar por definir"}
                    </strong>
                  </div>

                  <div className="wide">
                    <span>Dirección</span>
                    <strong>{fullAddress || "Dirección por confirmar"}</strong>
                  </div>
                </div>
              </div>

              {evento.description ? (
                <div className="eventDescriptionBox">
                  <h2 className="eventSectionTitle">Sobre el evento</h2>
                  <p>{evento.description}</p>
                </div>
              ) : null}

              <section className="eventLocationBox">
                <div className="eventLocationHeader">
                  <span>Ubicación</span>
                  <h2 className="eventSectionTitle">
                    {evento.venue || evento.location || "Lugar por definir"}
                  </h2>
                  <p>{fullAddress || "Dirección por confirmar"}</p>
                </div>

                <EventMap
                  address={evento.address}
                  city={evento.city}
                  region={evento.region}
                  height={250}
                />
              </section>
            </div>

            <aside className="eventDetailRight">
              <section className="eventTicketsBox">
                <h2 className="eventSidebarTitle">Selecciona tu entrada</h2>

                {ticketTypes.length === 0 ? (
                  <div className="eventNoTickets">
                    <p>Este evento aún no tiene entradas configuradas.</p>
                  </div>
                ) : (
                  <div className="eventTicketList">
                    {ticketTypes.map((ticket) => {
                      const soldOut =
                        !ticket.unlimitedStock &&
                        Number(ticket.stock || 0) <= 0;

                      return (
                        <div
                          key={ticket.id}
                          className={`eventTicketOption ${
                            selectedTicketId === ticket.id ? "selected" : ""
                          } ${soldOut ? "soldOut" : ""}`}
                        >
                          <div>
                            <strong>{ticket.name}</strong>

                            {ticket.description ? (
                              <p>{ticket.description}</p>
                            ) : null}

                            <span>
                              {ticket.unlimitedStock
                                ? "Stock ilimitado"
                                : soldOut
                                ? "Agotado"
                                : `${ticket.stock} disponibles`}
                            </span>
                          </div>

                          <div className="eventTicketBuy">
                            <strong>{formatPrice(ticket.price)}</strong>

                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => handleSelectTicket(ticket.id)}
                              disabled={soldOut}
                            >
                              Añadir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {showAttendeeForm && selectedTicket ? (
                <section className="eventAttendeeBox" id="datos-asistente">
                  <h2 className="eventSidebarTitle">Datos del asistente</h2>
                  <p>
                    Entrada <strong>{selectedTicket.name}</strong> por{" "}
                    <strong>{formatPrice(selectedTicket.price)}</strong>.
                  </p>

                  <div className="eventAttendeeGrid">
                    <div className="field">
                      <label>Nombre completo</label>
                      <input
                        type="text"
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        placeholder="Ej: Juan Pérez González"
                      />
                    </div>

                    <div className="field">
                      <label>Tipo de documento</label>
                      <select
                        value={documentType}
                        onChange={(e) => {
                          setDocumentType(e.target.value);
                          setDocumentNumber("");
                        }}
                      >
                        <option value="RUT">RUT / RUN</option>
                        <option value="DNI">DNI</option>
                        <option value="PASSPORT">Pasaporte</option>
                        <option value="FOREIGN_ID">Cédula extranjera</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Número de documento</label>
                      <input
                        type="text"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        onBlur={() => {
                          if (documentType === "RUT") {
                            setDocumentNumber(formatRut(documentNumber));
                          }
                        }}
                        placeholder={
                          documentType === "RUT"
                            ? "Ej: 111111111"
                            : "Ej: A12345678"
                        }
                      />
                    </div>
                  </div>

                  <div className="eventActionRow">
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={handleAddToCart}
                    >
                      Confirmar y agregar
                    </button>

                    <button
                      type="button"
                      className="btn btnGhostDark"
                      onClick={() => {
                        resetAttendeeData();
                        setShowAttendeeForm(false);
                        setSelectedTicketId("");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="eventSummaryBox" id="resumen-compra">
                <h2 className="eventSidebarTitle">Resumen de compra</h2>

                {eventCartItems.length === 0 ? (
                  <p className="eventSummaryEmpty">
                    Aún no has agregado entradas.
                  </p>
                ) : (
                  <>
                    <div className="eventCartList">
                      {eventCartItems.map((item) => (
                        <div key={item.cartItemId} className="eventCartItem">
                          <div>
                            <strong>{item.ticketName}</strong>
                            <span>{item.attendeeName}</span>
                            <span>
                              {item.attendeeDocumentType}:{" "}
                              {item.attendeeDocumentNumber}
                            </span>
                          </div>

                          <div>
                            <strong>{formatPrice(item.price)}</strong>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.cartItemId)}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="eventTotalRow">
                      <span>Total</span>
                      <strong>{formatPrice(total)}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn btnPrimary eventPayButton"
                      onClick={handleContinueToPayment}
                      disabled={isPaying}
                    >
                      {isPaying ? "Redirigiendo..." : "Pagar con Webpay"}
                    </button>
                  </>
                )}
              </section>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}