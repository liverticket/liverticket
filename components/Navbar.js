"use client";

import { useEffect, useRef, useState } from "react";

function playNotificationSound() {
  try {
    const audioContext =
      new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1046, audioContext.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.08,
      audioContext.currentTime + 0.02
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.28
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {}
}

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [hasMyEvents, setHasMyEvents] = useState(false);

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const previousPendingCountRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  function showToast(message) {
    setToastMessage(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 3500);
  }

  function closeAllMenus() {
    setUserMenuOpen(false);
    setMobileNavOpen(false);
  }

  async function loadCartCount() {
    try {
      const res = await fetch("/api/cart", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setCartCount(0);
        return;
      }

      const items = Array.isArray(data.cartItems) ? data.cartItems : [];

      const total = items.reduce(
        (acc, item) => acc + Number(item.quantity || 1),
        0
      );

      setCartCount(total);
    } catch {
      setCartCount(0);
    }
  }

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
          setCartCount(0);
          setHasMyEvents(false);
        }
      } catch {
        setUser(null);
        setCartCount(0);
        setHasMyEvents(false);
      } finally {
        setLoadingUser(false);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setCartCount(0);
      setHasMyEvents(false);
      return;
    }

    loadCartCount();

    window.addEventListener("liverticket-cart-updated", loadCartCount);

    return () => {
      window.removeEventListener("liverticket-cart-updated", loadCartCount);
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setHasMyEvents(false);
      return;
    }

    async function loadMyEventsVisibility() {
      try {
        const res = await fetch("/api/my-events", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          setHasMyEvents(false);
          return;
        }

        const data = await res.json();

        setHasMyEvents(Boolean(data.hasMyEvents));
      } catch {
        setHasMyEvents(false);
      }
    }

    loadMyEventsVisibility();
  }, [user]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    async function loadPending() {
      try {
        const res = await fetch("/api/admin/event-requests", {
          cache: "no-store",
        });

        const data = await res.json();

        const pending =
          (data.requests || []).filter((r) => r.status === "PENDING").length;

        if (
          previousPendingCountRef.current !== null &&
          pending > previousPendingCountRef.current
        ) {
          const diff = pending - previousPendingCountRef.current;

          playNotificationSound();
          showToast(
            diff === 1
              ? "Nueva solicitud recibida"
              : `${diff} nuevas solicitudes recibidas`
          );
        }

        previousPendingCountRef.current = pending;
        setPendingCount(pending);
      } catch {}
    }

    loadPending();

    const interval = setInterval(loadPending, 45000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target) &&
        !e.target.closest(".mobileMenuButton")
      ) {
        setMobileNavOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    window.location.href = "/";
  }

  return (
    <>
      <header className="navbar">
        <div className="container navbarInner">
          <div className="navbarLeft">
            <button
              type="button"
              className={`mobileMenuButton ${mobileNavOpen ? "open" : ""}`}
              onClick={() => {
                setMobileNavOpen((prev) => !prev);
                setUserMenuOpen(false);
              }}
              aria-label="Abrir menú"
              aria-expanded={mobileNavOpen}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            <a href="/" className="logo" onClick={closeAllMenus}>
              <span className="logoAccent">L</span>iverTicket
            </a>
          </div>

          <nav className="navLinks">
            <a href="/">Cartelera</a>
            <a href="/crearevento">Crear Evento</a>

            {hasMyEvents && <a href="/mis-eventos">Mis Eventos</a>}

            <a href="/mis-tickets">Mis Tickets</a>
            <a href="/contacto">Contacto</a>

            <a href="/carrito" className="cartNavButton" title="Carrito">
              <span className="cartNavIcon">🛒</span>
              {cartCount > 0 && (
                <span className="cartNavCount">{cartCount}</span>
              )}
            </a>

            {user?.role === "ADMIN" && (
              <a href="/admin/solicitudes" className="adminBtn">
                <div
                  className={`adminWrapper ${
                    pendingCount > 0 ? "hasPending" : ""
                  }`}
                >
                  <span className="adminText">Solicitudes</span>

                  {pendingCount > 0 && (
                    <span className="adminBadge">{pendingCount}</span>
                  )}
                </div>
              </a>
            )}
          </nav>

          <div className="navbarRight">
            <a
              href="/carrito"
              className="cartNavButton mobileOnlyCart"
              title="Carrito"
            >
              <span className="cartNavIcon">🛒</span>
              {cartCount > 0 && (
                <span className="cartNavCount">{cartCount}</span>
              )}
            </a>

            {loadingUser ? (
              <div className="userMenuSkeleton">Cargando...</div>
            ) : !user ? (
              <>
                <a href="/ingresar" className="desktopLoginButton loginButton">
                  Iniciar Sesión
                </a>

                <a
                  href="/ingresar"
                  className="mobileUserAccess"
                  aria-label="Iniciar sesión"
                >
                  <span className="mobileUserAccessIcon">👤</span>
                </a>
              </>
            ) : (
              <div className="userMenuWrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className="userMenuButton"
                  onClick={() => {
                    setUserMenuOpen((prev) => !prev);
                    setMobileNavOpen(false);
                  }}
                >
                  <span className="userDot"></span>
                  <span className="userName">{user.name}</span>
                  <span className={`userArrow ${userMenuOpen ? "open" : ""}`}>
                    ▾
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="userDropdown">
                    <a href="/perfil" className="userDropdownItem">
                      Mi perfil
                    </a>

                    <a href="/mis-tickets" className="userDropdownItem">
                      Mis tickets
                    </a>

                    {hasMyEvents && (
                      <a href="/mis-eventos" className="userDropdownItem">
                        Mis eventos
                      </a>
                    )}

                    <a href="/carrito" className="userDropdownItem">
                      Carrito
                    </a>

                    {user.role === "ADMIN" && (
                      <a href="/admin/solicitudes" className="userDropdownItem">
                        Solicitudes
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="userDropdownItem logoutItem"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        className={`mobileNavOverlay ${mobileNavOpen ? "open" : ""}`}
        onClick={() => setMobileNavOpen(false)}
      />

      <aside
        ref={mobileMenuRef}
        className={`mobileSideMenu ${mobileNavOpen ? "open" : ""}`}
      >
        <div className="mobileSideMenuHeader">
          <span className="mobileSideMenuTitle">Menú</span>
          <button
            type="button"
            className="mobileSideMenuClose"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="mobileSideNav">
          <a href="/" onClick={closeAllMenus}>
            Cartelera
          </a>

          <a href="/crearevento" onClick={closeAllMenus}>
            Crear Evento
          </a>

          {hasMyEvents && (
            <a href="/mis-eventos" onClick={closeAllMenus}>
              Mis Eventos
            </a>
          )}

          <a href="/mis-tickets" onClick={closeAllMenus}>
            Mis Tickets
          </a>

          <a href="/contacto" onClick={closeAllMenus}>
            Contacto
          </a>

          <a href="/carrito" onClick={closeAllMenus}>
            Carrito
          </a>

          {!loadingUser && !user ? (
            <a href="/ingresar" onClick={closeAllMenus}>
              Iniciar Sesión
            </a>
          ) : null}

          {user?.role === "ADMIN" && (
            <a href="/admin/solicitudes" onClick={closeAllMenus}>
              Solicitudes
              {pendingCount > 0 ? ` (${pendingCount})` : ""}
            </a>
          )}

          {user ? (
            <>
              <a href="/perfil" onClick={closeAllMenus}>
                Mi perfil
              </a>

              <button
                type="button"
                className="mobileLogoutButton"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </>
          ) : null}
        </nav>
      </aside>

      {toastMessage ? (
        <div
          style={{
            position: "fixed",
            top: "92px",
            right: "20px",
            zIndex: 9999,
            minWidth: "260px",
            maxWidth: "340px",
            background: "#111",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "999px",
              background: "#25d366",
              marginTop: "6px",
              flexShrink: 0,
              boxShadow: "0 0 12px rgba(37,211,102,0.5)",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "4px",
              }}
            >
              LiverTicket
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.45,
                color: "#e9e9e9",
              }}
            >
              {toastMessage}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}