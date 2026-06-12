"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const CART_STORAGE_KEY = "liverticket_cart";

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default function CarritoPage() {
  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [openItems, setOpenItems] = useState({});
  const [guestEmail, setGuestEmail] = useState("");

  function loadGuestCart() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setCartItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCartItems([]);
    }
  }

  async function loadCart() {
    if (!currentUser?.id) {
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
          try {
            const cartRes = await fetch("/api/cart", { cache: "no-store" });
            const cartData = await cartRes.json();

            if (cartRes.ok) {
              setCartItems(
                Array.isArray(cartData.cartItems) ? cartData.cartItems : []
              );
            } else {
              setCartItems([]);
            }
          } catch {
            setCartItems([]);
          }
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

  const groupedByEvent = useMemo(() => {
    const map = new Map();

    cartItems.forEach((item) => {
      if (!map.has(item.eventId)) {
        map.set(item.eventId, {
          eventId: item.eventId,
          eventTitle: item.eventTitle,
          eventImageUrl: item.eventImageUrl,
          eventDate: item.eventDate,
          eventVenue: item.eventVenue,
          eventAddress: item.eventAddress,
          items: [],
        });
      }

      map.get(item.eventId).items.push(item);
    });

    return Array.from(map.values());
  }, [cartItems]);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const serviceFee = 0;
  const total = subtotal + serviceFee;

  function toggleItem(cartItemId) {
    setOpenItems((prev) => ({
      ...prev,
      [cartItemId]: !prev[cartItemId],
    }));
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

    try {
      const res = await fetch(`/api/cart/${cartItemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("No se pudo quitar la entrada.");
        return;
      }

      await loadCart();
      window.dispatchEvent(new Event("liverticket-cart-updated"));
    } catch {
      alert("No se pudo quitar la entrada.");
    }
  }

  async function handleClearCart() {
    const confirmed = window.confirm("¿Seguro que quieres vaciar el carrito?");
    if (!confirmed) return;

    if (!currentUser?.id) {
      setCartItems([]);
      localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new Event("liverticket-cart-updated"));
      return;
    }

    try {
      await Promise.all(
        cartItems.map((item) =>
          fetch(`/api/cart/${item.cartItemId}`, {
            method: "DELETE",
          })
        )
      );

      await loadCart();
      window.dispatchEvent(new Event("liverticket-cart-updated"));
    } catch {
      alert("No se pudo vaciar el carrito.");
    }
  }

  async function handlePay() {
    if (cartItems.length === 0) {
      alert("Tu carrito está vacío.");
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
          cartItems,
          guestEmail: currentUser?.id ? undefined : guestEmail.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo iniciar el pago con Webpay.");
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
    } catch {
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
          <div className="checkoutGrid">
            <section className="checkoutMainCard checkoutMainCardLarge">
              <div className="checkoutSectionHeader">
                <h2>Carrito de compra</h2>
              </div>

              {isLoadingUser ? (
                <div className="checkoutEmptyBox">
                  <p>Cargando carrito...</p>
                </div>
              ) : groupedByEvent.length === 0 ? (
                <div className="checkoutEmptyBox">
                  <p>No hay entradas agregadas en el carrito.</p>
                </div>
              ) : (
                <div className="checkoutEventsStack">
                  {groupedByEvent.map((group) => (
                    <div key={group.eventId} className="checkoutEventGroup">
                      <div className="checkoutEventGroupHeader">
                        <img
                          src={group.eventImageUrl || "/placeholder-event.jpg"}
                          alt={group.eventTitle}
                          className="checkoutEventGroupImage"
                        />

                        <div className="checkoutEventGroupInfo">
                          <h3 className="checkoutEventGroupTitle">
                            {group.eventTitle}
                          </h3>

                          <p className="checkoutEventMetaText">
                            {formatDate(group.eventDate)} ·{" "}
                            {formatTime(group.eventDate)}
                          </p>

                          <p className="checkoutEventMetaText">
                            {group.eventVenue || "Recinto por confirmar"}
                          </p>

                          {group.eventAddress && (
                            <p className="checkoutEventAddressText">
                              {group.eventAddress}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="checkoutCartList">
                        {group.items.map((item) => {
                          const itemKey = item.cartItemId || item.id;
                          const isOpen = Boolean(openItems[itemKey]);

                          return (
                            <div
                              key={itemKey}
                              className={`checkoutCartItem ${
                                isOpen ? "open" : ""
                              }`}
                            >
                              <div className="checkoutCartItemMain">
                                <div>
                                  <div className="checkoutCartItemName">
                                    {item.ticketTypeName ||
                                      item.ticketName ||
                                      "Entrada"}
                                  </div>

                                  <div className="checkoutCartItemDetails">
                                    <div className="checkoutCartItemMeta">
                                      <strong>Asistente:</strong>{" "}
                                      {item.attendeeName}
                                    </div>

                                    <div className="checkoutCartItemMeta">
                                      <strong>Documento:</strong>{" "}
                                      {item.attendeeDocumentType}{" "}
                                      {item.attendeeDocumentNumber}
                                    </div>

                                    <div className="checkoutCartItemMeta">
                                      <strong>Cantidad:</strong> {item.quantity}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="checkoutDetailsToggle"
                                    onClick={() => toggleItem(itemKey)}
                                  >
                                    {isOpen ? "Ocultar detalles" : "Ver detalles"}
                                  </button>
                                </div>

                                <div className="checkoutCartItemPriceBox">
                                  <strong>
                                    {formatPrice(
                                      Number(item.price || 0) *
                                        Number(item.quantity || 1)
                                    )}
                                  </strong>

                                  <button
                                    type="button"
                                    className="checkoutRemoveItem"
                                    onClick={() => handleRemoveItem(itemKey)}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </div>

                              <div className="checkoutCartItemRight">
                                <strong>
                                  {formatPrice(
                                    Number(item.price || 0) *
                                      Number(item.quantity || 1)
                                  )}
                                </strong>

                                <button
                                  type="button"
                                  className="checkoutRemoveItem"
                                  onClick={() => handleRemoveItem(itemKey)}
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <aside className="checkoutSummaryCard checkoutSummaryCardLarge">
              <h2>Resumen</h2>

              {currentUser?.id ? (
                <div className="checkoutSummaryBlock">
                  <span>Correo de envío</span>
                  <strong>{currentUser.email}</strong>
                </div>
              ) : (
                <div className="guestEmailBox">
                  <div className="guestEmailIcon">✉️</div>

                  <h3>¿A qué correo enviamos tus entradas?</h3>
                  <p>
                    Escribe bien tu correo. Aquí recibirás tus tickets y códigos
                    QR después del pago.
                  </p>

                  <input
                    type="email"
                    className="guestEmailInput"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="ejemplo@email.com"
                  />
                </div>
              )}

              <div className="checkoutDivider"></div>

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
                onClick={handlePay}
                disabled={isPaying || cartItems.length === 0}
              >
                {isPaying ? "Conectando con Webpay..." : "Pagar con Webpay"}
              </button>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  className="btn btnSecondary checkoutClearButton"
                  onClick={handleClearCart}
                  style={{ width: "100%", marginTop: 10 }}
                >
                  Vaciar carrito
                </button>
              )}

              <p className="checkoutHelpText">
                Si tienes cuenta, tus entradas quedarán guardadas en Mis Tickets
                y también llegarán a tu correo.
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}