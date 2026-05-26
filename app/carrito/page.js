"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

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

export default function CarritoPage() {
  const router = useRouter();

  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [openItems, setOpenItems] = useState({});

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

        if (!res.ok) {
          setCurrentUser(null);
          setCartItems([]);
          return;
        }

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
    (acc, item) => acc + item.price * item.quantity,
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
    if (!currentUser?.id) {
      router.push("/ingresar?redirect=%2Fcarrito");
      return;
    }

    if (cartItems.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    try {
      setIsPaying(true);

      const res = await fetch("/api/webpay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cartItems }),
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

  return (
    <>
      <Navbar />

      <main className="section">
        <div className="container checkoutContainer">
          <div className="checkoutGrid">
            <section className="checkoutMainCard checkoutMainCardLarge">
              <div className="checkoutSectionHeader">
                <h2>Carrito de compra</h2>
                <p>Revisa todas las entradas que agregaste antes de pagar.</p>
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
                            {formatTime(group.eventDate)} hrs
                          </p>

                          <p className="checkoutEventMetaText">
                            {group.eventVenue}
                          </p>

                          <p className="checkoutEventMetaText checkoutEventAddressText">
                            {group.eventAddress}
                          </p>
                        </div>
                      </div>

                      <div className="checkoutCartList">
                        {group.items.map((item) => {
                          const isOpen = !!openItems[item.cartItemId];

                          return (
                            <div
                              key={item.cartItemId}
                              className={`checkoutCartItem ${
                                isOpen ? "open" : ""
                              }`}
                            >
                              <div className="checkoutCartItemMain">
                                <div>
                                  <div className="checkoutCartItemName">
                                    {item.ticketName}
                                  </div>

                                  <div className="checkoutCartItemVisibleName">
                                    {item.attendeeName}
                                  </div>

                                  <button
                                    type="button"
                                    className="checkoutDetailsToggle"
                                    onClick={() => toggleItem(item.cartItemId)}
                                  >
                                    {isOpen ? "Ocultar datos" : "Ver datos"}
                                  </button>

                                  <div className="checkoutCartItemDetails">
                                    <div className="checkoutCartItemMeta">
                                      {item.attendeeName}
                                    </div>

                                    <div className="checkoutCartItemMeta">
                                      {item.attendeeDocumentType}:{" "}
                                      {item.attendeeDocumentNumber}
                                    </div>

                                    <div className="checkoutCartItemMeta">
                                      Cantidad: {item.quantity}
                                    </div>

                                    <div className="checkoutCartItemMeta">
                                      {formatPrice(item.price)} c/u
                                    </div>
                                  </div>
                                </div>

                                <div className="checkoutCartItemPriceBox">
                                  <strong>
                                    {formatPrice(item.price * item.quantity)}
                                  </strong>

                                  <button
                                    type="button"
                                    className="checkoutRemoveItem"
                                    onClick={() =>
                                      handleRemoveItem(item.cartItemId)
                                    }
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </div>

                              <div className="checkoutCartItemRight">
                                <strong>
                                  {formatPrice(item.price * item.quantity)}
                                </strong>

                                <button
                                  type="button"
                                  className="checkoutRemoveItem"
                                  onClick={() =>
                                    handleRemoveItem(item.cartItemId)
                                  }
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
              <h2>Resumen de compra</h2>

              {cartItems.length === 0 ? (
                <div className="checkoutEmptyBox">
                  <p>No hay productos en el carrito.</p>
                </div>
              ) : (
                <>
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
        </div>
      </main>

      <Footer />
    </>
  );
}