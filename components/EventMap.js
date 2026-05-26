"use client";

export default function EventMap({
  address = "",
  city = "",
  region = "",
  height = 280,
}) {
  const cleanAddress = String(address || "").trim();
  const cleanCity = String(city || "").trim();
  const cleanRegion = String(region || "").trim();

  // 🔥 SOLO usamos dirección para construir la búsqueda del mapa
  const queryParts = [cleanAddress, cleanCity, cleanRegion, "Chile"].filter(
    Boolean
  );
  const fullLocation = queryParts.join(", ");

  if (!fullLocation) {
    return null;
  }

  const encodedLocation = encodeURIComponent(fullLocation);
  const embedUrl = `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
  const openMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;

  return (
    <div className="eventMapBox">
      <div className="eventMapTop">
        <a
          href={openMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="eventMapLink"
        >
          Abrir en Maps
        </a>
      </div>

      <iframe
        title={`Mapa de ${cleanAddress || cleanCity || cleanRegion || "ubicación del evento"}`}
        src={embedUrl}
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}