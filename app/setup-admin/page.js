"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function SetupAdminPage() {
  const [checking, setChecking] = useState(true);
  const [setupEnabled, setSetupEnabled] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup-admin");
        const data = await res.json();

        if (res.ok) {
          setSetupEnabled(Boolean(data.setupEnabled));
        } else {
          setError(data.error || "No se pudo validar el setup.");
        }
      } catch (error) {
        setError("No se pudo validar el setup del administrador.");
      } finally {
        setChecking(false);
      }
    }

    checkSetup();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/setup-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo crear el administrador.");
        setLoading(false);
        return;
      }

      setSuccess("Administrador creado correctamente. Redirigiendo...");
      setTimeout(() => {
        window.location.href = "/admin/solicitudes";
      }, 1200);
    } catch (error) {
      setError("Ocurrió un error al crear el administrador.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <>
        <Navbar />
        <main className="loginPage">
          <div className="loginCard">
            <h1>Configurando LiverTicket</h1>
            <p className="loginSubtitle">Validando estado del sistema...</p>
          </div>
        </main>
      </>
    );
  }

  if (!setupEnabled) {
    return (
      <>
        <Navbar />
        <main className="loginPage">
          <div className="loginCard">
            <h1>Setup bloqueado</h1>
            <p className="loginSubtitle">
              El administrador inicial ya fue creado. Esta página ya no está disponible.
            </p>

            <a href="/ingresar" className="loginButton" style={{ display: "inline-flex", justifyContent: "center" }}>
              Ir a iniciar sesión
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="loginPage">
        <div className="loginCard">
          <h1>Configura el primer admin</h1>
          <p className="loginSubtitle">
            Crea la cuenta administradora principal de LiverTicket. Esta configuración se puede realizar una sola vez.
          </p>

          <form className="loginForm" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmar contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            <ul className="passwordRules">
              <li className={formData.password.length >= 8 ? "ok" : ""}>
                Mínimo 8 caracteres
              </li>
              <li className={/[A-Z]/.test(formData.password) ? "ok" : ""}>
                1 letra mayúscula
              </li>
              <li className={/[0-9]/.test(formData.password) ? "ok" : ""}>
                1 número
              </li>
              <li
                className={
                  /[!@#$%^&*(),.?":{}|<>_\-\\[\]/+=;']/.test(formData.password)
                    ? "ok"
                    : ""
                }
              >
                1 símbolo
              </li>
            </ul>

            {error ? <p className="formError">{error}</p> : null}
            {success ? <p className="formSuccess">{success}</p> : null}

            <button className="loginButton" type="submit" disabled={loading}>
              {loading ? "Creando administrador..." : "Crear administrador"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}