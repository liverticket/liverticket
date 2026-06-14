import Link from "next/link";

function getAgeLabel(evento) {
  const minAge = Number(evento.minAge);

  if (!Number.isNaN(minAge) && minAge > 0) {
    return `Desde ${minAge} años`;
  }

  return "";
}

function getMinPriceLabel(evento) {
  const ticketTypes = Array.isArray(evento.ticketTypes)
    ? evento.ticketTypes
    : [];

  const prices = ticketTypes
    .map((ticket) => Number(ticket.price || 0))
    .filter((price) => price > 0);

  if (prices.length === 0) return "Entrada por confirmar";

  const minPrice = Math.min(...prices);

  return `Desde ${new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(minPrice)}`;
}

function isEventFinishedOneDayAfter(dateString) {
  if (!dateString) return false;

  const eventDate = new Date(dateString);
  const finishLimit = new Date(eventDate);

  finishLimit.setDate(finishLimit.getDate() + 1);
  finishLimit.setHours(0, 0, 0, 0);

  return new Date() >= finishLimit;
}

export default function EventCard({ evento }) {
  const eventFinished = isEventFinishedOneDayAfter(evento.date);

  const fechaFormateada = evento.date
    ? new Date(evento.date).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Fecha por definir";

  const horaFormateada = evento.eventTime
    ? `${evento.eventTime} hrs.`
    : "Horario por confirmar";

  const ticketTypes = Array.isArray(evento.ticketTypes)
    ? evento.ticketTypes
    : [];

  const isSoldOut =
    ticketTypes.length > 0 &&
    ticketTypes.every(
      (ticket) => !ticket.unlimitedStock && Number(ticket.stock || 0) <= 0
    );

  const ageLabel = getAgeLabel(evento);
  const priceLabel = getMinPriceLabel(evento);

  return (
    <Link href={`/evento/${evento.id}`} className="eventCardLink">
      <article className={`eventCard ${eventFinished ? "eventFinishedCard" : ""}`}>
        <div className="eventImageWrap">
          <img
            src={evento.imageUrl || "/placeholder-event.jpg"}
            alt={evento.title || "Evento"}
            className="eventImage"
          />

          {eventFinished ? (
            <div className="eventFinishedBadge">EVENTO FINALIZADO</div>
          ) : isSoldOut ? (
            <div className="eventSoldOutBadge">AGOTADO</div>
          ) : null}
        </div>

        <div className="eventBody">
          <span className="eventBadge">{evento.category?.name || "Evento"}</span>

          <h3>{evento.title || "Sin título"}</h3>

          <p className="eventPlace">
            {evento.city ? `${evento.city} · ` : ""}
            {evento.location || evento.venue || "Lugar por definir"}
          </p>

          <div className="eventMeta">
            <span>
              {fechaFormateada} · {horaFormateada}
            </span>
          </div>

          {ageLabel && <div className="eventAge">Edad: {ageLabel}</div>}

          <div className="eventFooter">
            <span
              className={
                eventFinished || isSoldOut ? "eventPrice soldOut" : "eventPrice"
              }
            >
              {eventFinished ? "Venta finalizada" : isSoldOut ? "Agotado" : priceLabel}
            </span>

            <span className="eventCardAction">Ver evento</span>
          </div>
        </div>
      </article>
    </Link>
  );
}