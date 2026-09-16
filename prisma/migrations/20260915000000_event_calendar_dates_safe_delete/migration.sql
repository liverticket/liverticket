-- Calendar fields were TIMESTAMP WITHOUT TIME ZONE. Preserve their stored
-- calendar component without applying the database/session timezone.
BEGIN;
ALTER TABLE "Event" ALTER COLUMN "date" TYPE DATE USING "date"::date;
ALTER TABLE "EventRequest" ALTER COLUMN "tentativeDate" TYPE DATE USING "tentativeDate"::date;

-- Financial history must never cascade through an event or a ticket type.
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_eventId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_ticketTypeId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_eventId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
