"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventMap from "@/components/EventMap";

const CART_STORAGE_KEY = "liverticket_cart";

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function makeGuestCartItemId() {
  return `guest-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function isEventFinishedOneDayAfter(dateString) {
  if (!dateString) return false;

  const eventDate = new Date(dateString);
  const finishLimit = new Date(eventDate);

  finishLimit.setDate(finishLimit.getDate() + 1);
  finishLimit.setHours(0, 0, 0, 0);

  return new Date() >= finishLimit;
}

export default function EventoDetallePage() {
  const params = useParams();
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
  const [guestEmail, setGuestEmail] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  function loadGuestCart() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setCartItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCartItems([]);
    }
  }

  async function loadCart(user = currentUser) {
    if (!user?.id) {
      loadGuestCart();
      return;
    }

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

        if (!res.ok) {
          setCurrentUser(null);
          loadGuestCart();
          return;
        }

        const data = await res.json();
        const user = data.user || null;

        setCurrentUser(user);

        if (user?.id) {
          await loadCart(user);
        } else {
          loadGuestCart();
        }
      } catch {
        setCurrentUser(null);
        loadGuestCart();
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
  const eventFinished = isEventFinishedOneDayAfter(evento?.date);

  function resetAttendeeData() {
    setAttendeeName("");
    setDocumentType("RUT");
    setDocumentNumber("");
  }

  function handleSelectTicket(ticketId) {
    if (eventFinished) {
      alert("Este evento ya se realizó. La venta de entradas no está disponible.");
      return;
    }

    setSelectedTicketId(ticketId);
    setShowAttendeeForm(true);

    setTimeout(() => {
      document
        .getElementById("datos-asistente")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleAddToCart() {
    if (eventFinished) {
      alert("Este evento ya se realizó. La venta de entradas no está disponible.");
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

    if (currentUser?.id) {
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
    } else {
      const guestItemId = makeGuestCartItemId();

      const guestItem = {
        cartItemId: guestItemId,
        id: guestItemId,
        eventId: evento.id,
        eventTitle: evento.title,
        eventImageUrl: evento.imageUrl || "/placeholder-event.jpg",
        eventDate: evento.date,
        eventVenue: evento.venue || evento.location || "Lugar por definir",
        eventAddress: [evento.address, evento.city, evento.region]
          .filter(Boolean)
          .join(", "),
        ticketTypeId: selectedTicket.id,
        ticketName: selectedTicket.name,
        ticketTypeName: selectedTicket.name,
        price: selectedTicket.price,
        quantity: 1,
        attendeeName: cleanName,
        attendeeDocumentType: cleanDocumentType,
        attendeeDocumentNumber: cleanDocumentNumber,
      };

      const nextItems = [...cartItems, guestItem];
      setCartItems(nextItems);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    }

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
    if (!currentUser?.id) {
      const nextItems = cartItems.filter(
        (item) => item.cartItemId !== cartItemId && item.id !== cartItemId
      );

      setCartItems(nextItems);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
      window.dispatchEvent(new Event("liverticket-cart-updated"));
      return;
    }

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
    if (eventFinished) {
      alert("Este evento ya se realizó. La venta de entradas no está disponible.");
      return;
    }

    if (eventCartItems.length === 0) {
      alert("Primero debes añadir al menos una entrada al carrito.");
      return;
    }

    if (!currentUser?.id && !isValidEmail(guestEmail)) {
      alert("Ingresa un correo válido para recibir tus entradas.");
      return;
    }

    try {
      setIsPaying(true);

      const res = await fetch("/api/webpay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartItems: eventCartItems,
          guestEmail: currentUser?.id ? undefined : guestEmail.trim(),
        }),
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
          <section className="eventDetailMainCard">
            <div className="eventDetailFlyerCol">
              <img
                src={evento.imageUrl || "/placeholder-event.jpg"}
                alt={evento.title || "Evento"}
                className="eventImageLarge"
              />
            </div>

            <div className="eventDetailInfoCol">
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
                <h2>Selecciona tu entrada</h2>

                {ticketTypes.length === 0 ? (
                  <div className="eventNoTickets">
                    <p>No hay entradas disponibles para este evento.</p>
                  </div>
                ) : (
                  <div className="eventTicketList">
                    {ticketTypes.map((ticket) => {
                      const soldOut =
                        !ticket.unlimitedStock &&
                        Number(ticket.stock || 0) <= 0;

                      const selected = selectedTicketId === ticket.id;

                      return (
                        <div
                          key={ticket.id}
                          className={`eventTicketOption ${
                            selected ? "selected" : ""
                          } ${soldOut || eventFinished ? "soldOut" : ""}`}
                        >
                          <div>
                            <strong>{ticket.name}</strong>

                            {ticket.description ? (
                              <p>{ticket.description}</p>
                            ) : null}

                            <span>
                              {eventFinished
                                ? "Venta finalizada"
                                : soldOut
                                ? "Agotado"
                                : ticket.unlimitedStock
                                ? "Stock ilimitado"
                                : `Stock disponible: ${ticket.stock}`}
                            </span>
                          </div>

                          <div className="eventTicketBuy">
                            <strong>{formatPrice(ticket.price)}</strong>

                            <button
                              type="button"
                              className="btn btnPrimary"
                              disabled={soldOut || eventFinished}
                              onClick={() => handleSelectTicket(ticket.id)}
                            >
                              {eventFinished
                                ? "No disponible"
                                : soldOut
                                ? "Agotado"
                                : "Añadir"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {showAttendeeForm && selectedTicket && !eventFinished ? (
                <section className="eventAttendeeBox" id="datos-asistente">
                  <h2>Datos del asistente</h2>

                  <p>
                    Entrada {selectedTicket.name} por{" "}
                    {formatPrice(selectedTicket.price)}.
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
                        onChange={(e) => setDocumentType(e.target.value)}
                      >
                        <option value="RUT">RUT / RUN</option>
                        <option value="PASAPORTE">Pasaporte</option>
                        <option value="DNI">DNI</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Número de documento</label>
                      <input
                        type="text"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        placeholder="Ej: 11111111"
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
                      className="btn btnLight"
                      onClick={() => {
                        resetAttendeeData();
                        setSelectedTicketId("");
                        setShowAttendeeForm(false);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="eventSummaryBox" id="resumen-compra">
                <h2>Resumen de compra</h2>

                {eventCartItems.length === 0 ? (
                  <p className="eventSummaryEmpty">
                    Aún no has agregado entradas.
                  </p>
                ) : (
                  <>
                    <div className="eventCartList">
                      {eventCartItems.map((item) => (
                        <div
                          key={item.cartItemId || item.id}
                          className="eventCartItem"
                        >
                          <div>
                            <strong>
                              {item.ticketName ||
                                item.ticketTypeName ||
                                "Entrada"}
                            </strong>

                            <span>{item.attendeeName}</span>

                            <span>
                              {item.attendeeDocumentType}:{" "}
                              {item.attendeeDocumentNumber}
                            </span>
                          </div>

                          <div>
                            <strong>{formatPrice(item.price)}</strong>

                            {!eventFinished && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveItem(item.cartItemId || item.id)
                                }
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!currentUser?.id && !eventFinished && (
                      <div className="eventAttendeeBox">
                        <h2>Correo para recibir entradas</h2>

                        <div className="eventAttendeeGrid">
                          <div className="field">
                            <label>Email</label>
                            <input
                              type="email"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              placeholder="tu_correo@email.com"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="eventTotalRow">
                      <span>Total</span>
                      <strong>{formatPrice(total)}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn btnPrimary eventPayButton"
                      disabled={isPaying || eventFinished}
                      onClick={handleContinueToPayment}
                    >
                      {eventFinished
                        ? "No disponible"
                        : isPaying
                        ? "Redirigiendo..."
                        : "Pagar con Webpay"}
                    </button>
                  </>
                )}
              </section>
              {eventFinished && (
                <div className="eventFinishedNotice">
                  Este evento ya se realizó.
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}