"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";

function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Al menos 1 mayúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Al menos 1 número");
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=;']/ .test(password)) {
    errors.push("Al menos 1 símbolo");
  }

  return errors;
}

export default function RegistrarsePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "password") {
      setPasswordErrors(validatePassword(value));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const passwordValidation = validatePassword(formData.password);

    if (passwordValidation.length > 0) {
      setPasswordErrors(passwordValidation);
      setError("La contraseña no cumple los requisitos de seguridad.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo registrar la cuenta.");
        setLoading(false);
        return;
      }

      setSuccess("Te enviamos un correo de verificación. Tu cuenta se activará cuando confirmes tu email.");
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setPasswordErrors([]);
    } catch (error) {
      setError("Ocurrió un error inesperado al registrar la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  const hasMinLength = formData.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=;']/.test(formData.password);
  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  return (
    <>
      <Navbar />

      <main className="loginPage">
        <div className="loginCard">
          <h1>Crear Cuenta</h1>
          <p className="loginSubtitle">
            Regístrate para comprar tickets y revisar tus eventos
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

            {formData.password && (
              <ul className="passwordRules">
                <li className={hasMinLength ? "ok" : ""}>Mínimo 8 caracteres</li>
                <li className={hasUppercase ? "ok" : ""}>1 letra mayúscula</li>
                <li className={hasNumber ? "ok" : ""}>1 número</li>
                <li className={hasSymbol ? "ok" : ""}>1 símbolo</li>
              </ul>
            )}

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmar contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            {formData.confirmPassword && (
              <p className={passwordsMatch ? "formSuccess" : "formError"}>
                {passwordsMatch
                  ? "Las contraseñas coinciden"
                  : "Las contraseñas no coinciden"}
              </p>
            )}

            {error ? <p className="formError">{error}</p> : null}
            {success ? <p className="formSuccess">{success}</p> : null}

            <button className="loginButton" type="submit" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <p className="loginRegister">
              ¿Ya tienes cuenta? <a href="/ingresar">Inicia sesión</a>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}