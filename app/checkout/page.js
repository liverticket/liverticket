"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const GUEST_CART_KEY = "liverticket_cart_guest";

function formatPrice(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateString) {
  if (!dateString) return "Fecha por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatTime(dateString) {
  if (!dateString) return "Hora por confirmar";

  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function normalizeDocumentNumber(value) {
  return String(value || "").trim();
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

  if (!/^\d{7,8}-[0-9K]$/.test(rut)) {
    return false;
  }

  const [body, dv] = rut.split("-");
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  let expectedDv = "";

  if (expected === 11) expectedDv = "0";
  else if (expected === 10) expectedDv = "K";
  else expectedDv = String(expected);

  return expectedDv === dv;
}

function getUserCartKey(userId) {
  return userId ? `liverticket_cart_${userId}` : null;
}

function getActiveCartKey(userId) {
  return userId ? getUserCartKey(userId) : GUEST_CART_KEY;
}

function getCart(userId) {
  if (typeof window === "undefined") return [];

  try {
    const storageKey = getActiveCartKey(userId);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(userId, cart) {
  if (typeof window === "undefined") return;

  const storageKey = getActiveCartKey(userId);
  localStorage.setItem(storageKey, JSON.stringify(cart));
  window.dispatchEvent(new Event("liverticket-cart-updated"));
}

function mergeGuestCartIntoUserCart(userId) {
  if (typeof window === "undefined" || !userId) return [];

  const userKey = getUserCartKey(userId);

  try {
    const guestRaw = localStorage.getItem(GUEST_CART_KEY);
    const userRaw = localStorage.getItem(userKey);

    const guestCart = guestRaw ? JSON.parse(guestRaw) : [];
    const userCart = userRaw ? JSON.parse(userRaw) : [];

    const safeGuestCart = Array.isArray(guestCart) ? guestCart : [];
    const safeUserCart = Array.isArray(userCart) ? userCart : [];

    if (safeGuestCart.length === 0) {
      return safeUserCart;
    }

    const mergedCart = [...safeUserCart, ...safeGuestCart];

    localStorage.setItem(userKey, JSON.stringify(mergedCart));
    localStorage.removeItem(GUEST_CART_KEY);
    window.dispatchEvent(new Event("liverticket-cart-updated"));

    return mergedCart;
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [loading, setLoading] = useState(true);
  const [evento, setEvento] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [isPaying, setIsPaying] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [attendeeName, setAttendeeName] = useState("");
  const [documentType, setDocumentType] = useState("RUT");
  const [documentNumber, setDocumentNumber] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!res.ok) {
          setCurrentUser(null);
          setCartItems(getCart(null));
          return;
        }

        const data = await res.json();
        const user = data.user || null;
        setCurrentUser(user);

        if (user?.id) {
          const merged = mergeGuestCartIntoUserCart(user.id);
          setCartItems(merged);
        } else {
          setCartItems(getCart(null));
        }
      } catch {
        setCurrentUser(null);
        setCartItems(getCart(null));
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
        console.error("Error cargando checkout:", error);
        setEvento(null);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  useEffect(() => {
    const syncCart = () => {
      setCartItems(getCart(currentUser?.id || null));
    };

    syncCart();
    window.addEventListener("liverticket-cart-updated", syncCart);

    return () => {
      window.removeEventListener("liverticket-cart-updated", syncCart);
    };
  }, [currentUser]);

  const ticketTypes = evento?.ticketTypes || [];

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
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const serviceFee = 0;
  const total = subtotal + serviceFee;

  function resetAttendeeData() {
    setAttendeeName("");
    setDocumentType("RUT");
    setDocumentNumber("");
  }

  function goToLogin() {
    const redirect = eventId ? `/checkout?eventId=${eventId}` : "/checkout";
    router.push(`/ingresar?redirect=${encodeURIComponent(redirect)}`);
  }

  function handleSelectTicket(ticketId) {
    setSelectedTicketId(ticketId);
    setShowAttendeeForm(true);

    setTimeout(() => {
      const form = document.getElementById("datos-asistente");
      form?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleAddToCart() {
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

    if (!selectedTicket.unlimitedStock && selectedTicket.stock < 1) {
      alert("No queda stock disponible para esta entrada.");
      return;
    }

    const currentCart = getCart(currentUser?.id || null);

    const sameDocumentInEvent = currentCart.find(
      (item) =>
        item.eventId === evento.id &&
        item.attendeeDocumentType === cleanDocumentType &&
        String(item.attendeeDocumentNumber || "").toUpperCase() ===
          cleanDocumentNumber.toUpperCase()
    );

    if (sameDocumentInEvent) {
      const confirmed = window.confirm(
        "Este documento ya tiene una entrada asociada a este evento. Si continúas, comprarás otra entrada para la misma persona. ¿Quieres seguir?"
      );

      if (!confirmed) return;
    }

    const newItem = {
      cartItemId:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      eventId: evento.id,
      eventTitle: evento.title,
      eventImageUrl: evento.imageUrl || "/placeholder-event.jpg",
      eventDate: evento.date,
      eventVenue: evento.venue || evento.location || "Lugar por definir",
      eventAddress: fullAddress,
      ticketTypeId: selectedTicket.id,
      ticketName: selectedTicket.name,
      price: selectedTicket.price,
      quantity: 1,
      attendeeName: cleanName,
      attendeeDocumentType: cleanDocumentType,
      attendeeDocumentNumber: cleanDocumentNumber,
    };

    const updatedCart = [...currentCart, newItem];
    saveCart(currentUser?.id || null, updatedCart);
    setCartItems(updatedCart);
    resetAttendeeData();
    setShowAttendeeForm(false);
    setSelectedTicketId("");

    setTimeout(() => {
      const resumen = document.getElementById("resumen-compra");
      resumen?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleRemoveItem(cartItemId) {
    const updatedCart = cartItems.filter(
      (item) => item.cartItemId !== cartItemId
    );
    saveCart(currentUser?.id || null, updatedCart);
    setCartItems(updatedCart);
  }

  async function handleContinueToPayment() {
    if (!currentUser?.id) {
      goToLogin();
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
        if (res.status === 400 && currentUser?.id) {
          saveCart(currentUser.id, []);
          setCartItems([]);
        }

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

  return (
    <>
      <Navbar />

      <main className="section">
        <div className="container checkoutContainer">
          {loading || isLoadingUser ? (
            <div className="simpleBox">
              <h1>Checkout</h1>
              <p>Cargando información del evento...</p>
            </div>
          ) : !eventId ? (
            <div className="simpleBox">
              <h1>Checkout</h1>
              <p>No se indicó ningún evento.</p>
            </div>
          ) : !evento ? (
            <div className="simpleBox">
              <h1>Evento no encontrado</h1>
              <p>No pudimos cargar la información de este evento.</p>
            </div>
          ) : (
            <div className="checkoutGrid">
              <section className="checkoutMainCard">
                <div className="checkoutEventHeader checkoutEventHeaderCompact">
                  <img
                    src={evento.imageUrl || "/placeholder-event.jpg"}
                    alt={evento.title || "Evento"}
                    className="checkoutEventImage"
                  />

                  <div className="checkoutEventInfo">
                    <div className="checkoutEventTopLine">
                      <span className="eventBadge">
                        {evento.category?.name || "Evento"}
                      </span>
                    </div>

                    <h1>{evento.title}</h1>

                    <div className="checkoutEventCompactInfo">
                      <div>
                        <span>Fecha</span>
                        <strong>{formatDate(evento.date)}</strong>
                      </div>

                      <div>
                        <span>Hora</span>
                        <strong>{formatTime(evento.date)} hrs</strong>
                      </div>

                      <div className="wide">
                        <span>Lugar</span>
                        <strong>
                          {evento.venue ||
                            evento.location ||
                            "Lugar por definir"}
                        </strong>
                      </div>

                      <div className="wide">
                        <span>Dirección</span>
                        <strong>{fullAddress || "Dirección por confirmar"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="checkoutSection">
                  <div className="checkoutSectionHeader">
                    <h2>Selecciona tu entrada</h2>
                    <p>
                      Presiona Añadir en el tipo de ticket que quieres comprar.
                    </p>
                  </div>

                  {ticketTypes.length === 0 ? (
                    <div className="checkoutEmptyBox">
                      <p>
                        Este evento aún no tiene tipos de entrada configurados.
                      </p>
                    </div>
                  ) : (
                    <div className="checkoutTicketList">
                      {ticketTypes.map((ticket) => {
                        const isSelected = selectedTicketId === ticket.id;
                        const soldOut =
                          !ticket.unlimitedStock && ticket.stock <= 0;

                        return (
                          <div
                            key={ticket.id}
                            className={`checkoutTicketOption ${
                              isSelected ? "selected" : ""
                            } ${soldOut ? "disabled" : ""}`}
                          >
                            <div className="checkoutTicketContent">
                              <div>
                                <strong>{ticket.name}</strong>
                                <p>
                                  {ticket.unlimitedStock
                                    ? "Stock ilimitado"
                                    : soldOut
                                    ? "Agotado"
                                    : `Stock disponible: ${ticket.stock}`}
                                </p>
                              </div>

                              <div className="checkoutTicketBuyBox">
                                <div className="checkoutTicketPrice">
                                  {formatPrice(ticket.price)}
                                </div>

                                <button
                                  type="button"
                                  className="btn btnPrimary checkoutTicketInlineButton"
                                  onClick={() => handleSelectTicket(ticket.id)}
                                  disabled={soldOut}
                                >
                                  Añadir
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {showAttendeeForm && selectedTicket ? (
                  <div className="checkoutSection" id="datos-asistente">
                    <div className="checkoutSectionHeader">
                      <h2>Datos del asistente</h2>
                      <p>
                        Estás agregando una entrada{" "}
                        <strong>{selectedTicket.name}</strong> por{" "}
                        <strong>{formatPrice(selectedTicket.price)}</strong>.
                      </p>
                    </div>

                    <div className="checkoutAttendeeGrid">
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

                    <div className="checkoutActionRow">
                      <button
                        type="button"
                        className="btn btnPrimary checkoutAddButton"
                        onClick={handleAddToCart}
                      >
                        Confirmar y agregar al carrito
                      </button>

                      <button
                        type="button"
                        className="btn btnGhostDark checkoutCancelButton"
                        onClick={() => {
                          resetAttendeeData();
                          setShowAttendeeForm(false);
                          setSelectedTicketId("");
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <aside className="checkoutSummaryCard" id="resumen-compra">
                <h2>Resumen de compra</h2>

                {eventCartItems.length === 0 ? (
                  <div className="checkoutEmptyBox">
                    <p>
                      Aún no has agregado entradas. Elige un ticket y presiona{" "}
                      <strong>Añadir</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="checkoutSummaryBlock">
                      <span>Evento</span>
                      <strong>{evento.title}</strong>
                    </div>

                    <div className="checkoutCartList">
                      {eventCartItems.map((item) => (
                        <div key={item.cartItemId} className="checkoutCartItem">
                          <div>
                            <div className="checkoutCartItemName">
                              {item.ticketName}
                            </div>
                            <div className="checkoutCartItemMeta">
                              {item.attendeeName}
                            </div>
                            <div className="checkoutCartItemMeta">
                              {item.attendeeDocumentType}:{" "}
                              {item.attendeeDocumentNumber}
                            </div>
                            <div className="checkoutCartItemMeta">
                              {formatPrice(item.price)}
                            </div>
                          </div>

                          <div className="checkoutCartItemRight">
                            <strong>{formatPrice(item.price)}</strong>

                            <button
                              type="button"
                              className="checkoutRemoveItem"
                              onClick={() => handleRemoveItem(item.cartItemId)}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="checkoutDivider" />

                    <div className="checkoutPriceRow">
                      <span>Subtotal</span>
                      <strong>{formatPrice(subtotal)}</strong>
                    </div>

                    <div className="checkoutPriceRow">
                      <span>Cargo por servicio</span>
                      <strong>{formatPrice(serviceFee)}</strong>
                    </div>

                    <div className="checkoutPriceRow total">
                      <span>Total</span>
                      <strong>{formatPrice(total)}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn btnPrimary checkoutPayButton"
                      onClick={handleContinueToPayment}
                      disabled={isPaying}
                    >
                      {isPaying ? "Redirigiendo..." : "Pagar con Webpay"}
                    </button>

                    <p className="checkoutHelpText">
                      Serás redirigido a Webpay para completar tu pago de forma
                      segura.
                    </p>
                  </>
                )}
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}