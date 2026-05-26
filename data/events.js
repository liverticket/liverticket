"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import EventMap from "../../../components/EventMap";

export default function EventoDetallePage() {
  const params = useParams();
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${params.id}`);
        const data = await res.json();

        setEvento(data.event);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadEvent();
    }
  }, [params]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="section">
          <div className="container simpleBox">
            <h1>Cargando evento...</h1>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!evento) {
    return (
      <>
        <Navbar />
        <main className="section">
          <div className="container simpleBox">
            <h1>Evento no encontrado</h1>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="section">
        <div className="container simpleBox">
          <img
            src={evento.imageUrl || "/placeholder-event.jpg"}
            alt={evento.title}
            className="eventImageLarge"
          />

          <span className="eventBadge">{evento.category}</span>

          <h1>{evento.title}</h1>

          <p className="eventPlace">
            {evento.city} · {evento.venue}
          </p>

          <p>
            {new Date(evento.eventDate).toLocaleDateString("es-CL")}
          </p>

          {/* 🔥 UBICACIÓN PRO */}
          <div className="eventLocationInfo">
            <p className="eventVenueName">{evento.venue}</p>
            <p className="eventAddressText">
              {evento.address}, {evento.city}, {evento.region}
            </p>
          </div>

          <EventMap
            venue={evento.venue}
            address={evento.address}
            city={evento.city}
            region={evento.region}
          />

          <div className="detailActions">
            <a href="/checkout" className="btn btnPrimary">
              Continuar compra
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}