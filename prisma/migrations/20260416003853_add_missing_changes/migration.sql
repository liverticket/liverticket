/*
  Warnings:

  - You are about to drop the column `attendeeRut` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `attendeeRut` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `attendeeDocumentNumber` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendeeDocumentType` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendeeDocumentNumber` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendeeDocumentType` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "OrderItem_attendeeRut_idx";

-- DropIndex
DROP INDEX "Ticket_attendeeRut_idx";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "attendeeRut",
ADD COLUMN     "attendeeDocumentNumber" TEXT NOT NULL,
ADD COLUMN     "attendeeDocumentType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "attendeeRut",
ADD COLUMN     "attendeeDocumentNumber" TEXT NOT NULL,
ADD COLUMN     "attendeeDocumentType" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "OrderItem_attendeeDocumentType_idx" ON "OrderItem"("attendeeDocumentType");

-- CreateIndex
CREATE INDEX "OrderItem_attendeeDocumentNumber_idx" ON "OrderItem"("attendeeDocumentNumber");

-- CreateIndex
CREATE INDEX "Ticket_attendeeDocumentType_idx" ON "Ticket"("attendeeDocumentType");

-- CreateIndex
CREATE INDEX "Ticket_attendeeDocumentNumber_idx" ON "Ticket"("attendeeDocumentNumber");
