"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo enviar la solicitud.");
        return;
      }

      setMessage(
        "Si el correo existe en LiverTicket, enviaremos un enlace para restablecer la contraseña."
      );
      setEmail("");
    } catch (err) {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="loginPage">
        <div className="loginCard">
          <h1>Recuperar contraseña</h1>

          <p className="loginSubtitle">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu
            contraseña.
          </p>

          <form className="loginForm" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {message ? <p className="formSuccess">{message}</p> : null}
            {error ? <p className="formError">{error}</p> : null}

            <button className="loginButton" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>

            <p className="loginRegister">
              ¿Recordaste tu contraseña? <a href="/ingresar">Inicia sesión</a>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}