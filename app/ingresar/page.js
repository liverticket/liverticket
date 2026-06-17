"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "../../components/Navbar";

function IngresarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        "liverticket_user",
        JSON.stringify({
          name: data.user.name,
          email: data.user.email,
        })
      );

      console.log("Usuario logueado:", data.user);

      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError("Ocurrió un error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="loginPage">
        <div className="loginCard">
          <h1>Inicia Sesión</h1>
          <p className="loginSubtitle">
            Ingresa a tu cuenta y accede a tus eventos
          </p>

          <form className="loginForm" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="passwordInputWrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <a href="#" className="loginLink">
              ¿Olvidaste tu contraseña?
            </a>

            {error ? <p className="formError">{error}</p> : null}

            <button className="loginButton" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Entrar"}
            </button>

            <p className="loginRegister">
              ¿No tienes cuenta? <a href="/registrarse">Regístrate</a>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}

export default function IngresarPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <IngresarContent />
    </Suspense>
  );
}