/*
  Warnings:

  - You are about to drop the column `expectedAttendance` on the `EventRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ageMax" INTEGER,
ADD COLUMN     "ageMin" INTEGER;

-- AlterTable
ALTER TABLE "EventRequest" DROP COLUMN "expectedAttendance",
ADD COLUMN     "ageMax" INTEGER,
ADD COLUMN     "ageMin" INTEGER;

-- AlterTable
ALTER TABLE "EventRequestTicketType" ADD COLUMN     "unlimitedStock" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "stock" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "unlimitedStock" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "stock" DROP NOT NULL;
