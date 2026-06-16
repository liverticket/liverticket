"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import EventCard from "@/components/EventCard";
import { chileRegions } from "@/lib/chileLocations";

const initialFilters = {
  query: "",
  category: "",
  region: "",
  city: "",
  date: "",
};

const categoryOptions = [
  "Concierto",
  "Festival",
  "Fiesta",
  "Tributo",
  "Stand Up",
  "Teatro",
  "Otro",
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function sameDate(dateA, dateB) {
  if (!dateA || !dateB) return false;

  const a = new Date(dateA);
  const b = new Date(dateB);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isUpcomingEvent(date) {
  if (!date) return false;

  const eventDate = new Date(date);
  const today = new Date();

  eventDate.setHours(23, 59, 59, 999);
  today.setHours(0, 0, 0, 0);

  return eventDate >= today;
}

function sortEventsByStatusAndDate(events) {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    const aUpcoming = isUpcomingEvent(a.date);
    const bUpcoming = isUpcomingEvent(b.date);

    if (aUpcoming !== bUpcoming) {
      return aUpcoming ? -1 : 1;
    }

    if (aUpcoming && bUpcoming) {
      return dateA - dateB;
    }

    return dateB - dateA;
  });
}

function normalizeEvent(evento) {
  return {
    ...evento,
    title: evento.title || evento.titulo || evento.nombre || "Sin título",
    description: evento.description || evento.descripcion || "",
    imageUrl: evento.imageUrl || evento.imagenUrl || "",
    location:
      evento.location ||
      evento.ubicacion ||
      evento["ubicación"] ||
      evento.venue ||
      evento.lugar ||
      "",
    venue:
      evento.venue ||
      evento.lugar ||
      evento.location ||
      evento.ubicacion ||
      evento["ubicación"] ||
      "",
    city: evento.city || evento.ciudad || "",
    region: evento.region || evento.regionName || evento.región || "",
    address: evento.address || evento.direccion || evento.dirección || "",
    date: evento.date || evento.fecha || null,
    ageMin: evento.ageMin ?? evento.edadMin ?? evento["edadMín"] ?? null,
    ageMax: evento.ageMax ?? evento.edadMax ?? evento["edadMáx"] ?? null,
    category: evento.category
      ? {
          ...evento.category,
          name: evento.category.name || evento.category.nombre || "Evento",
        }
      : evento.categoría
      ? {
          ...evento.categoría,
          name: evento.categoría.name || evento.categoría.nombre || "Evento",
        }
      : {
          name: evento.categoryName || evento.nombreCategoria || "Evento",
        },
    ticketTypes:
      evento.ticketTypes ||
      evento.tiposDeEntradas ||
      evento.tiposDeEntrada ||
      [],
  };
}

export default function Home() {
  const [eventos, setEventos] = useState([]);
  const [filteredEventos, setFilteredEventos] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("No se pudieron cargar los eventos");
        }

        const data = await res.json();
        const rawEvents = data.eventos || data.events || [];
        const normalizedEvents = rawEvents.map(normalizeEvent);
        const sortedEvents = sortEventsByStatusAndDate(normalizedEvents);

        setEventos(sortedEvents);
        setFilteredEventos(sortedEvents);
      } catch (error) {
        console.error("Error cargando eventos:", error);
        setEventos([]);
        setFilteredEventos([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    const query = normalizeText(filters.query);
    const category = normalizeText(filters.category);
    const region = normalizeText(filters.region);
    const city = normalizeText(filters.city);

    const results = eventos.filter((evento) => {
      const eventTitle = normalizeText(evento.title);
      const eventVenue = normalizeText(evento.venue || evento.location);
      const eventLocation = normalizeText(evento.location);
      const eventCity = normalizeText(evento.city);
      const eventRegion = normalizeText(evento.region);
      const eventAddress = normalizeText(evento.address);
      const eventCategory = normalizeText(evento.category?.name);

      const matchesQuery =
        !query ||
        eventTitle.includes(query) ||
        eventVenue.includes(query) ||
        eventLocation.includes(query) ||
        eventCity.includes(query) ||
        eventRegion.includes(query) ||
        eventAddress.includes(query) ||
        eventCategory.includes(query);

      const matchesCategory = !category || eventCategory === category;
      const matchesRegion = !region || eventRegion === region;
      const matchesCity = !city || eventCity === city;
      const matchesDate = !filters.date || sameDate(evento.date, filters.date);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesRegion &&
        matchesCity &&
        matchesDate
      );
    });

    const sortedResults = sortEventsByStatusAndDate(results);

    setFilteredEventos(sortedResults);
  }, [filters, eventos]);

  const upcomingEventos = useMemo(() => {
    return eventos
      .filter((evento) => isUpcomingEvent(evento.date) && evento.imageUrl)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [eventos]);

  useEffect(() => {
    if (upcomingEventos.length <= 1) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % upcomingEventos.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [upcomingEventos.length]);

  useEffect(() => {
    if (activeSlide >= upcomingEventos.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, upcomingEventos.length]);

  function handleFilterChange(e) {
    const { name, value } = e.target;

    setFilters((prev) => {
      if (name === "region") {
        return {
          ...prev,
          region: value,
          city: "",
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  }

  function handleSearch() {
    // El filtrado ya se aplica automáticamente con useEffect
  }

  function goToPrevSlide() {
    setActiveSlide((prev) =>
      prev === 0 ? upcomingEventos.length - 1 : prev - 1
    );
  }

  function goToNextSlide() {
    setActiveSlide((prev) => (prev + 1) % upcomingEventos.length);
  }

  const availableCities = useMemo(() => {
    if (!filters.region) return [];

    const regionData = chileRegions.find(
      (item) => item.region === filters.region
    );

    return regionData?.cities || [];
  }, [filters.region]);

  return (
    <main className="page">
      <Navbar />

      <section className="hero">
        <div className="container heroContent">
          <h1 className="heroTitle">Encuentra tus próximos eventos</h1>

          <SearchBar
            filters={filters}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            regions={chileRegions.map((item) => item.region)}
            cities={availableCities}
            categories={categoryOptions}
          />

          {upcomingEventos.length > 0 && (
            <div className="homeFlyerCarousel">
              <button
                type="button"
                className="homeFlyerArrow homeFlyerArrowLeft"
                onClick={goToPrevSlide}
                aria-label="Evento anterior"
              >
                ‹
              </button>

              <Link
                href={`/evento/${upcomingEventos[activeSlide].id}`}
                className="homeFlyerSlide"
              >
                <img
                  src={upcomingEventos[activeSlide].imageUrl}
                  alt={upcomingEventos[activeSlide].title}
                  className="homeFlyerImage"
                />
              </Link>

              <button
                type="button"
                className="homeFlyerArrow homeFlyerArrowRight"
                onClick={goToNextSlide}
                aria-label="Evento siguiente"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eventsGrid">
            {loadingEvents ? (
              <p>Cargando eventos...</p>
            ) : filteredEventos.length > 0 ? (
              filteredEventos.map((evento) => (
                <EventCard key={evento.id} evento={evento} />
              ))
            ) : (
              <p>No hay eventos que coincidan con tu búsqueda.</p>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="ctaBox">
            <h2>¿Quieres vender tu evento con LiverTicket?</h2>
            <p>
              Publica tu evento, gestiona tus asistentes y controla tus ventas en
              una sola plataforma.
            </p>

            <Link href="/crear-evento" className="btn btnLight">
              Crear evento
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}