-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "attendeeName" TEXT,
ADD COLUMN     "attendeeRut" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "attendeeName" TEXT,
ADD COLUMN     "attendeeRut" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_attendeeRut_idx" ON "OrderItem"("attendeeRut");

-- CreateIndex
CREATE INDEX "Ticket_attendeeRut_idx" ON "Ticket"("attendeeRut");
