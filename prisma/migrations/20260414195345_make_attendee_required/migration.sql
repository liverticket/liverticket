/*
  Warnings:

  - Made the column `attendeeName` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `attendeeRut` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `attendeeName` on table `Ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `attendeeRut` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "attendeeName" SET NOT NULL,
ALTER COLUMN "attendeeRut" SET NOT NULL;

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "attendeeName" SET NOT NULL,
ALTER COLUMN "attendeeRut" SET NOT NULL;
