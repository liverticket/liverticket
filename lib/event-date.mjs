// Event dates are calendar labels, not instants. UTC is only the Prisma/Intl
// transport convention; never convert these values to the viewer's timezone.
export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function calendarDate(value) {
  if (!value) return "";
  // Legacy Prisma timestamps (00:00, Chilean midnight, or noon) carry the
  // selected day in their UTC date component. Do not apply a local offset.
  const text = value instanceof Date ? value.toISOString() : String(value);
  const day = text.slice(0, 10);
  return isCalendarDate(day) ? day : "";
}

export function toDatabaseDate(value) {
  if (!isCalendarDate(value)) throw new RangeError("Fecha inválida; usa YYYY-MM-DD.");
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatEventDate(value, options = {}) {
  const day = calendarDate(value);
  if (!day) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric", ...options, timeZone: "UTC",
  }).format(toDatabaseDate(day));
}

export function chileToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addCalendarDays(value, days) {
  const date = toDatabaseDate(calendarDate(value));
  date.setUTCDate(date.getUTCDate() + days);
  return calendarDate(date);
}

export function isEventFinished(value, now = new Date()) {
  return Boolean(calendarDate(value)) && calendarDate(value) < chileToday(now);
}

export function formatEventTime(value) {
  return value ? `${value} hrs.` : "Hora por confirmar";
}
