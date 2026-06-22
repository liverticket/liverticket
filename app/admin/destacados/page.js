"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";

function formatDate(value) {
  if (!value) return "Fecha no especificada";

  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminDestacadosPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadingEventId, setUploadingEventId] = useState("");

  async function loadEvents() {
    try {
      const res = await fetch("/api/admin/destacados", {
        cache: "no-store",
      });

      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFeaturedImageToCloudinary(file) {
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

    const result = await res.json();

    if (!res.ok) {
        console.error(result);
        throw new Error("No se pudo subir la imagen a Cloudinary");
    }

    return result.secure_url;
    }

    async function handleFeaturedImageUpload(eventId, file) {
        if (!file) return;

        const img = new Image();

        img.onload = async () => {
          if (img.width !== 1400 || img.height !== 450) {
            alert(
              `La imagen debe ser exactamente 1400x450 px.\n\nLa imagen seleccionada es ${img.width}x${img.height}px`
            );
            return;
          }

          setUploadingEventId(eventId);

          try {
            const imageUrl = await uploadFeaturedImageToCloudinary(file);

            updateEvent(eventId, "featuredImageUrl", imageUrl);
          } catch (error) {
            console.error(error);
            alert("No se pudo subir la imagen destacada.");
          } finally {
            setUploadingEventId("");
          }
        };

        img.src = URL.createObjectURL(file);
        }

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return events;

    return events.filter((event) => {
      return [
        event.title,
        event.city,
        event.venue,
        event.location,
        event.category?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [events, searchTerm]);

  function updateEvent(id, field, value) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id
          ? {
              ...event,
              [field]: value,
            }
          : event
      )
    );
  }

  async function saveFeatured() {
    setSaving(true);

    try {
      const res = await fetch("/api/admin/destacados", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudieron guardar los destacados.");
        return;
      }

      alert("Destacados guardados correctamente.");
      await loadEvents();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="ticketsPage">
        <div className="ticketsShell">
          <div className="ticketsHeader">
            <div>
              <p className="ticketsTag">ADMIN</p>
              <h1>Destacados</h1>
              <p className="ticketsSubtitle">
                Selecciona los eventos que aparecerán en el banner principal de la página.
              </p>
            </div>

            <button
              type="button"
              className="btn btnPrimary"
              onClick={saveFeatured}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar destacados"}
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#15151a",
              color: "#fff",
              padding: "14px 16px",
              outline: "none",
              marginBottom: 24,
            }}
          />

          {loading ? (
            <div className="ticketsEmptyCard">
              <h1>Cargando eventos...</h1>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="ticketsEmptyCard">
              <h1>Sin eventos vigentes</h1>
              <p>No hay eventos publicados disponibles para destacar.</p>
            </div>
          ) : (
            <div className="ticketsList">
              {filteredEvents.map((event) => (
                <div key={event.id} className="ticketCard">
                  <div
                    className="ticketInfo"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "130px minmax(0, 1fr)",
                      gap: 18,
                    }}
                  >
                    <img
                      src={event.featuredImageUrl || event.imageUrl || "/placeholder-event.jpg"}
                      alt={event.title}
                      style={{
                        width: "130px",
                        height: "82px",
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                      }}
                    />

                    <div>
                      <div className="ticketTopRow">
                        <span className="ticketType">
                          {event.category?.name || "Evento"}
                        </span>

                        {event.isFeatured ? (
                          <span className="ticketStatus statusValidado">
                            Destacado
                          </span>
                        ) : (
                          <span className="ticketStatus statusExpirado">
                            No destacado
                          </span>
                        )}
                      </div>

                      <h2>{event.title}</h2>

                      <p className="ticketPlace">
                        {event.city ? `${event.city} · ` : ""}
                        {event.venue || event.location || "Lugar por definir"} ·{" "}
                        {formatDate(event.date)}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "150px minmax(0, 1fr)",
                          gap: 14,
                          marginTop: 18,
                        }}
                      >
                        <label
                          style={{
                            color: "#111",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(event.isFeatured)}
                            onChange={(e) =>
                              updateEvent(event.id, "isFeatured", e.target.checked)
                            }
                          />
                          Mostrar
                        </label>

                        <input
                          type="number"
                          min="1"
                          placeholder="Orden"
                          value={event.featuredOrder || ""}
                          onChange={(e) =>
                            updateEvent(event.id, "featuredOrder", e.target.value)
                          }
                          style={{
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            padding: "12px 14px",
                          }}
                        />

                        <div style={{ gridColumn: "1 / -1" }}>
                            <label
                                style={{
                                display: "block",
                                color: "#111",
                                fontWeight: 800,
                                marginBottom: 8,
                                }}
                            >
                                Imagen horizontal para banner
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                handleFeaturedImageUpload(event.id, e.target.files?.[0])
                                }
                                style={{
                                width: "100%",
                                borderRadius: 12,
                                border: "1px solid #ddd",
                                padding: "12px 14px",
                                background: "#fff",
                                color: "#111",
                                }}
                            />

                            <p style={{ color: "#777", marginTop: 8 }}>
                                {uploadingEventId === event.id
                                ? "Subiendo imagen..."
                                : "Tamaño obligatorio imagen: 1920 x 600 px"}
                            </p>

                            {event.featuredImageUrl ? (
                                <p style={{ color: "#078b36", marginTop: 8, fontWeight: 800 }}>
                                Imagen cargada correctamente.
                                </p>
                            ) : null}
                            </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}