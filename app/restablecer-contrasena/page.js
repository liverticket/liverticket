"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";

function validatePassword(password) {
  const errors = [];

  if (password.length < 8) errors.push("Mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Al menos 1 mayúscula");
  if (!/[0-9]/.test(password)) errors.push("Al menos 1 número");
  if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=;']/.test(password)) {
    errors.push("Al menos 1 símbolo");
  }

  return errors;
}

function RestablecerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=;']/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("El enlace de recuperación no es válido.");
      return;
    }

    const passwordValidation = validatePassword(password);

    if (passwordValidation.length > 0) {
      setPasswordErrors(passwordValidation);
      setError("La contraseña no cumple los requisitos de seguridad.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo restablecer la contraseña.");
        return;
      }

      setMessage("Contraseña actualizada correctamente.");

      setTimeout(() => {
        router.push("/ingresar");
      }, 1800);
    } catch (error) {
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
          <h1>Nueva contraseña</h1>

          <p className="loginSubtitle">
            Ingresa una nueva contraseña para tu cuenta.
          </p>

          <form className="loginForm" onSubmit={handleSubmit}>
            <div className="passwordInputWrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordErrors(validatePassword(e.target.value));
                }}
                required
              />

              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {password && (
              <ul className="passwordRules">
                <li className={hasMinLength ? "ok" : ""}>
                  Mínimo 8 caracteres
                </li>
                <li className={hasUppercase ? "ok" : ""}>
                  1 letra mayúscula
                </li>
                <li className={hasNumber ? "ok" : ""}>1 número</li>
                <li className={hasSymbol ? "ok" : ""}>1 símbolo</li>
              </ul>
            )}

            <div className="passwordInputWrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            {confirmPassword && (
              <p className={passwordsMatch ? "formSuccess" : "formError"}>
                {passwordsMatch
                  ? "Las contraseñas coinciden"
                  : "Las contraseñas no coinciden"}
              </p>
            )}

            {message ? <p className="formSuccess">{message}</p> : null}
            {error ? <p className="formError">{error}</p> : null}

            <button className="loginButton" type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RestablecerContent />
    </Suspense>
  );
}