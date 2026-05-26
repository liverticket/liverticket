"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PerfilPage() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    paternalLastName: "",
    maternalLastName: "",
    email: "",
    phone: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.user) {
          const normalizedUser = {
            name: data.user.name || "",
            paternalLastName: data.user.paternalLastName || "",
            maternalLastName: data.user.maternalLastName || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
          };

          setUser(data.user);
          setFormData(normalizedUser);
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la información del usuario.");
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "phone") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 9);

      setFormData((prev) => ({
        ...prev,
        phone: onlyNumbers,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleEdit() {
    setIsEditing(true);
    setMessage("");
    setError("");
  }

  function handleCancel() {
    setFormData({
      name: user?.name || "",
      paternalLastName: user?.paternalLastName || "",
      maternalLastName: user?.maternalLastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });

    setIsEditing(false);
    setMessage("");
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!formData.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!formData.email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email.trim())) {
      setError("Ingresa un correo válido.");
      return;
    }

    if (formData.phone && !/^\d{9}$/.test(formData.phone)) {
      setError("El teléfono debe tener exactamente 9 dígitos.");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        paternalLastName: formData.paternalLastName.trim(),
        maternalLastName: formData.maternalLastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      };

      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al guardar.");
        return;
      }

      const updated = {
        name: data.user.name || "",
        paternalLastName: data.user.paternalLastName || "",
        maternalLastName: data.user.maternalLastName || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
      };

      setUser(data.user);
      setFormData(updated);
      setIsEditing(false);
      setMessage("Datos actualizados correctamente 🔥");
    } catch (err) {
      console.error(err);
      setError("Error de conexión.");
    }
  }

  return (
    <>
      <Navbar />

      <main className="createEventPage">
        <div className="createEventShell">
          <div className="createEventHeader">
            <p className="createEventTag">MI PERFIL</p>
            <h1>Tu cuenta en LiverTicket</h1>
            <p className="createEventSubtitle">
              Revisa y actualiza la información de tu cuenta.
            </p>
          </div>

          <div className="profileCard">
            {loadingUser ? (
              <p>Cargando perfil...</p>
            ) : (
              <>
                <div className="profileTop">
                  <div className="profileAvatar">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
                  </div>

                  <div className="profileIntro">
                    <h2>
                      {formData.name || "Usuario"}{" "}
                      {formData.paternalLastName || ""}{" "}
                      {formData.maternalLastName || ""}
                    </h2>
                    <p>{formData.email || "Sin correo"}</p>
                  </div>
                </div>

                {!isEditing && (
                  <div className="profileActions" style={{ marginBottom: 18 }}>
                    <button
                      type="button"
                      className="btn btnPrimary"
                      onClick={handleEdit}
                    >
                      Editar datos
                    </button>
                  </div>
                )}

                <form onSubmit={handleSave} className="profileForm">
                  <div className="profileField">
                    <label htmlFor="name">Nombre *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="profileGrid">
                    <div className="profileField">
                      <label htmlFor="paternalLastName">Apellido paterno</label>
                      <input
                        id="paternalLastName"
                        name="paternalLastName"
                        type="text"
                        value={formData.paternalLastName}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="profileField">
                      <label htmlFor="maternalLastName">Apellido materno</label>
                      <input
                        id="maternalLastName"
                        name="maternalLastName"
                        type="text"
                        value={formData.maternalLastName}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="profileField">
                    <label htmlFor="email">Correo *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="profileField">
                    <label htmlFor="phone">Teléfono</label>
                    <div className="phoneField">
                      <span className="phonePrefix">+56</span>
                      <input
                        id="phone"
                        name="phone"
                        type="text"
                        inputMode="numeric"
                        pattern="\d{9}"
                        maxLength={9}
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="912345678"
                      />
                    </div>
                    <span className="fieldHelp">
                      Ingresa 9 dígitos, solo números.
                    </span>
                  </div>

                  {error && <p className="formError">{error}</p>}
                  {message && <p className="formSuccess">{message}</p>}

                  {isEditing && (
                    <div className="profileActions">
                      <button type="submit" className="btn btnPrimary">
                        Guardar cambios
                      </button>

                      <button
                        type="button"
                        className="btnGhost"
                        onClick={handleCancel}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </form>

                <div className="profileExtra" style={{ marginTop: 18 }}>
                  <Link href="/mis-tickets" className="btn btnLight">
                    🎟️ Ver mis tickets
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}