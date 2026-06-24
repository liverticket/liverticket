"use client";

import Link from "next/link";

export default function HomeHeroBanner({
  events = [],
  activeSlide,
  onPrev,
  onNext,
}) {
  if (!events.length) return null;

  const event = events[activeSlide] || events[0];
  const bannerImage = event.featuredImageUrl || event.imageUrl;

  return (
    <section
      className="homeHeroBanner"
      style={{
        "--banner-image": `url(${bannerImage})`,
      }}
    >
      <img
        src={bannerImage}
        alt={event.title || "Evento destacado"}
        className="homeHeroBannerImage"
      />

      <div className="homeHeroBannerActions">
        <Link href={`/evento/${event.id}`} className="homeHeroBannerButton">
          Ver más
        </Link>
      </div>

      {events.length > 1 && (
        <>
          <button
            type="button"
            className="homeHeroBannerArrow homeHeroBannerArrowLeft"
            onClick={onPrev}
            aria-label="Evento anterior"
          >
            ‹
          </button>

          <button
            type="button"
            className="homeHeroBannerArrow homeHeroBannerArrowRight"
            onClick={onNext}
            aria-label="Evento siguiente"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}