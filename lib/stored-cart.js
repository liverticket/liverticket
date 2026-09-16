// Browser carts are snapshots. Reconcile against live events before showing
// them so deleted events and stale event dates/times do not survive in storage.
export async function refreshStoredCart(key) {
  try {
    const response = await fetch("/api/events", { cache: "no-store" });
    if (!response.ok) return [];
    const { events } = await response.json();
    if (!Array.isArray(events)) return [];
    const byId = new Map(events.map((event) => [event.id, event]));
    const previous = localStorage.getItem(key);
    const parsed = previous ? JSON.parse(previous) : [];
    const items = (Array.isArray(parsed) ? parsed : []).flatMap((item) => {
      const event = byId.get(item.eventId);
      if (!event || !event.ticketTypes?.some((ticket) => ticket.id === item.ticketTypeId)) return [];
      return [{ ...item, eventDate: event.date, eventTime: event.eventTime, eventTitle: event.title }];
    });
    const next = JSON.stringify(items);
    if (next !== previous) {
      localStorage.setItem(key, next);
      window.dispatchEvent(new Event("liverticket-cart-updated"));
    }
    return items;
  } catch {
    // Keep stored data on a network failure, but do not present it as verified.
    return [];
  }
}
