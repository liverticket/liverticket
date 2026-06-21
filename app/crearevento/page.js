"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { chileRegions } from "@/lib/chileLocations";

const emptyForm = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  eventName: "",
  category: "",
  tentativeDate: "",
  minAge: "",
  eventTime: "",
  region: "",
  city: "",
  venue: "",
  address: "",
  message: "",
};

function createEmptyTicketType() {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    name: "",
    description: "",
    price: "",
    stock: "",
    unlimitedStock: false,
  };
}

function getTodayLocalDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const local = new Date(today.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
}

export default function CrearEventoPage() {
  const router = useRouter();
  const todayMinDate = getTodayLocalDate();

  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [formData, setFormData] = useState(emptyForm);
  const [ticketTypes, setTicketTypes] = useState([createEmptyTicketType()]);
  const [flyer, setFlyer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRegionData = useMemo(() => {
    return chileRegions.find((item) => item.region === formData.region);
  }, [formData.region]);

  const availableCities = selectedRegionData?.cities || [];

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok || !data.user) {
          router.replace("/ingresar");
          return;
        }

        setCurrentUser(data.user);

        const fullLastName = [
          data.user.paternalLastName || "",
          data.user.maternalLastName || "",
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        setFormData((prev) => ({
          ...prev,
          firstName: data.user.name || "",
          lastName: fullLastName || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
        }));
      } catch (authError) {
        console.error("Error cargando usuario actual:", authError);
        router.replace("/ingresar");
      } finally {
        setCheckingAuth(false);
      }
    }

    loadCurrentUser();
  }, [router]);

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

    if (name === "minAge") {
      const onlyNumbers = value.replace(/\D/g, "").slice(0, 2);
      setFormData((prev) => ({
        ...prev,
        [name]: onlyNumbers,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleRegionChange(e) {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      region: value,
      city: "",
    }));
  }

  function handleCityChange(e) {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      city: value,
    }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setFlyer(file);
  }

  function addTicketType() {
    setTicketTypes((prev) => [...prev, createEmptyTicketType()]);
  }

  function removeTicketType(id) {
    setTicketTypes((prev) => prev.filter((ticket) => ticket.id !== id));
  }

  function updateTicketType(id, field, value) {
    setTicketTypes((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== id) return ticket;

        if (field === "unlimitedStock") {
          return {
            ...ticket,
            unlimitedStock: value,
            stock: value ? "" : ticket.stock,
          };
        }

        return { ...ticket, [field]: value };
      })
    );
  }



  async function uploadFlyerToCloudinary(file) {
    const data = new FormData();

    data.append("file", file);
    data.append("upload_preset", "liverticket");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dx5rgijv7/image/upload",
      {
        method: "POST",
        body: data,
      }
    );

    if (!res.ok) {
      throw new Error("No se pudo subir el flyer a Cloudinary");
    }

    const result = await res.json();
    return result.secure_url;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!currentUser) {
      setError("Debes iniciar sesión para enviar una solicitud.");
      setLoading(false);
      router.replace("/ingresar");
      return;
    }

    const requiredFields = [
      "firstName",
      "lastName",
      "company",
      "email",
      "phone",
      "eventName",
      "category",
      "tentativeDate",
      "minAge",
      "eventTime",
      "region",
      "city",
      "venue",
      "address",
      "message",
    ];

    for (const field of requiredFields) {
      if (!String(formData[field] || "").trim()) {
        setError("Debes completar todos los campos obligatorios.");
        setLoading(false);
        return;
      }
    }

    const minAge = Number(formData.minAge);

    if (!Number.isFinite(minAge) || minAge < 0) {
      setError("La edad mínima debe ser válida.");
      setLoading(false);
      return;
    }

    if (!flyer) {
      setError("Debes subir un flyer del evento.");
      setLoading(false);
      return;
    }

    const normalizedTicketTypes = ticketTypes.map((ticket) => ({
      name: String(ticket.name || "").trim(),
      description: String(ticket.description || "").trim(),
      price: Number(ticket.price),
      stock: ticket.unlimitedStock ? null : Number(ticket.stock),
      unlimitedStock: Boolean(ticket.unlimitedStock),
    }));

    const invalidTicket = normalizedTicketTypes.find(
      (ticket) =>
        !ticket.name ||
        !Number.isFinite(ticket.price) ||
        ticket.price <= 0 ||
        (!ticket.unlimitedStock &&
          (!Number.isFinite(ticket.stock) || ticket.stock <= 0))
    );

    if (invalidTicket) {
      setError(
        "Cada tipo de entrada debe tener nombre, precio válido y stock válido, salvo que uses stock ilimitado."
      );
      setLoading(false);
      return;
    }

    try {
      const flyerUrl = await uploadFlyerToCloudinary(flyer);

      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "phone") {
          payload.append(key, `+56${value}`);
        } else {
          payload.append(key, value);
        }
      });

      payload.append("ticketTypes", JSON.stringify(normalizedTicketTypes));
      payload.append("flyerUrl", flyerUrl);

      const res = await fetch("/api/event-requests", {
        method: "POST",
        body: payload,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo enviar la solicitud.");
        setLoading(false);
        return;
      }

      setSuccess(
        "Solicitud enviada correctamente. La revisaremos antes de publicarla."
      );

      const fullLastName = [
        currentUser.paternalLastName || "",
        currentUser.maternalLastName || "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setFormData({
        ...emptyForm,
        firstName: currentUser.name || "",
        lastName: fullLastName || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      });

      setTicketTypes([createEmptyTicketType()]);
      setFlyer(null);

      const fileInput = document.getElementById("flyer");
      if (fileInput) fileInput.value = "";
    } catch (submitError) {
      console.error("Error enviando solicitud:", submitError);
      setError("Ocurrió un error al enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <>
        <Navbar />
        <main className="createEventPage">
          <div className="createEventShell">
            <div className="createEventHeader">
              <p className="createEventTag">ORGANIZA CON LIVERTICKET</p>
              <h1>Cargando formulario...</h1>
              <p className="createEventSubtitle">
                Estamos verificando tu sesión.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="createEventPage">
        <div className="createEventShell">
          <div className="createEventHeader">
            <p className="createEventTag">ORGANIZA CON LIVERTICKET</p>
            <h1>Cuéntanos sobre tu evento</h1>
            <p className="createEventSubtitle">
              Completa este formulario y te contactaremos para ayudarte a
              publicar y vender tus entradas en LiverTicket.
            </p>
          </div>

          <form className="createEventForm" onSubmit={handleSubmit}>
            <section className="formSection">
              <div className="formSectionTitle">
                <span className="formSectionLine" />
                <h2>Datos personales</h2>
              </div>

              <div className="formGrid">
                <div className="field">
                  <label htmlFor="firstName">Nombre *</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="lastName">Apellido *</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Tus apellidos"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field fieldFull">
                  <label htmlFor="company">Empresa / Productora *</label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    placeholder="Nombre de tu empresa o productora"
                    value={formData.company}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="email">Correo electrónico *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="phone">Teléfono *</label>
                  <div className="phoneField">
                    <span className="phonePrefix">+56</span>
                    <input
                      id="phone"
                      name="phone"
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      pattern="\d{9}"
                      placeholder="912345678"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <small className="fieldHelp">
                    Ingresa 9 dígitos, sin espacios y solo números.
                  </small>
                </div>
              </div>
            </section>

            <section className="formSection">
              <div className="formSectionTitle">
                <span className="formSectionLine" />
                <h2>Datos del evento</h2>
              </div>

              <div className="formGrid">
                <div className="field fieldFull">
                  <label htmlFor="eventName">Nombre del evento *</label>
                  <input
                    id="eventName"
                    name="eventName"
                    type="text"
                    placeholder="Ej: Tributo a Bon Jovi en Talca"
                    value={formData.eventName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="category">Categoría del evento *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      Selecciona una categoría
                    </option>
                    <option value="Concierto">Concierto</option>
                    <option value="Festival">Festival</option>
                    <option value="Fiesta">Fiesta</option>
                    <option value="Tributo">Tributo</option>
                    <option value="Stand Up">Stand Up</option>
                    <option value="Teatro">Teatro</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tentativeDate">
                    Fecha tentativa del evento *
                  </label>
                  <input
                    id="tentativeDate"
                    name="tentativeDate"
                    type="date"
                    min={todayMinDate}
                    value={formData.tentativeDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="minAge">Edad mínima *</label>
                  <input
                    id="minAge"
                    name="minAge"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="Ej: 18"
                    value={formData.minAge}
                    onChange={handleChange}
                    required
                  />
                  <small className="fieldHelp">
                    Se mostrará como: Desde {formData.minAge || "18"} años.
                  </small>
                </div>

                <div className="field">
                  <label htmlFor="eventTime">Hora del evento *</label>
                  <input
                    id="eventTime"
                    name="eventTime"
                    type="time"
                    value={formData.eventTime}
                    onChange={handleChange}
                    required
                  />
                  <small className="fieldHelp">
                    Se mostrará en cartelera como horario oficial del evento.
                  </small>
                </div>

                <div className="field">
                  <label htmlFor="region">Región *</label>
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleRegionChange}
                    required
                  >
                    <option value="" disabled>
                      Selecciona una región
                    </option>
                    {chileRegions.map((item) => (
                      <option key={item.region} value={item.region}>
                        {item.region}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="city">Ciudad / Comuna *</label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleCityChange}
                    required
                    disabled={!formData.region}
                  >
                    <option value="" disabled>
                      {formData.region
                        ? "Selecciona una ciudad"
                        : "Primero selecciona región"}
                    </option>

                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field fieldFull">
                  <label htmlFor="venue">Venue / Lugar del evento *</label>
                  <input
                    id="venue"
                    name="venue"
                    type="text"
                    placeholder="Ej: Teatro Ext UCM"
                    value={formData.venue}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field fieldFull">
                  <label htmlFor="address">Dirección del evento *</label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Ej: 3 Norte 650"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                  <small className="fieldHelp">
                    Escribe una dirección clara. Ejemplo: 3 Norte 650, Talca.
                  </small>
                </div>

                <div className="field fieldFull">
                  <label htmlFor="message">Descripción del evento *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    placeholder="Cuéntanos más sobre tu evento."
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field fieldFull">
                  <label htmlFor="flyer">Flyer del evento *</label>
                  <input
                    id="flyer"
                    name="flyer"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="formSection">
              <div className="formSectionTitle">
                <span className="formSectionLine" />
                <h2>Tipos de entrada</h2>
              </div>

              <button
                type="button"
                className="btnGhostDark"
                onClick={addTicketType}
              >
                + Agregar tipo de entrada
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
                {ticketTypes.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    style={{
                      border: "1px solid #e4e4e4",
                      borderRadius: 16,
                      padding: 18,
                      background: "#fafafa",
                    }}
                  >
                    <strong>Entrada #{index + 1}</strong>

                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicketType(ticket.id)}
                        style={{
                          marginLeft: 12,
                          background: "transparent",
                          border: "none",
                          color: "#c4151f",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    )}

                    <div className="formGrid" style={{ marginTop: 16 }}>
                      <div className="field">
                        <label>Nombre del ticket *</label>
                        <input
                          type="text"
                          placeholder="Ej: Preventa 1"
                          value={ticket.name}
                          onChange={(e) =>
                            updateTicketType(ticket.id, "name", e.target.value)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Precio *</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Ej: 15000"
                          value={ticket.price}
                          onChange={(e) =>
                            updateTicketType(ticket.id, "price", e.target.value)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Stock</label>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          {!ticket.unlimitedStock ? (
                            <input
                              type="number"
                              min="1"
                              placeholder="Ej: 100"
                              value={ticket.stock}
                              onChange={(e) =>
                                updateTicketType(ticket.id, "stock", e.target.value)
                              }
                            />
                          ) : (
                            <div
                              style={{
                                padding: "14px 15px",
                                borderRadius: 12,
                                border: "1px solid #dcdcdc",
                                background: "#f3f3f3",
                                color: "#555",
                                fontWeight: 600,
                              }}
                            >
                              Sin límite de stock
                            </div>
                          )}

                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              fontWeight: 700,
                              color: "#111",
                              whiteSpace: "nowrap",
                              margin: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={ticket.unlimitedStock}
                              onChange={(e) =>
                                updateTicketType(
                                  ticket.id,
                                  "unlimitedStock",
                                  e.target.checked
                                )
                              }
                            />
                            Stock ilimitado
                          </label>
                        </div>
                      </div>

                      <div className="field fieldFull">
                        <label>Descripción (Opcional) </label>
                        <textarea
                          rows="3"
                          value={ticket.description}
                          onChange={(e) =>
                            updateTicketType(
                              ticket.id,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {error ? <p className="formError">{error}</p> : null}
            {success ? <p className="formSuccess">{success}</p> : null}

            <div className="createEventActions">
              <button
                type="button"
                className="btnGhost"
                onClick={() => router.back()}
              >
                Volver
              </button>

              <button
                type="submit"
                className="btn btnPrimary createEventSubmit"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}