-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "EventRequestTicketType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "eventRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRequestTicketType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRequestTicketType_eventRequestId_idx" ON "EventRequestTicketType"("eventRequestId");

-- AddForeignKey
ALTER TABLE "EventRequestTicketType" ADD CONSTRAINT "EventRequestTicketType_eventRequestId_fkey" FOREIGN KEY ("eventRequestId") REFERENCES "EventRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
