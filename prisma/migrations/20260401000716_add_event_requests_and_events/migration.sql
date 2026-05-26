/*
  Warnings:

  - A unique constraint covering the columns `[sourceRequestId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EventRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "sourceRequestId" TEXT,
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "EventRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tentativeDate" TIMESTAMP(3) NOT NULL,
    "expectedAttendance" TEXT NOT NULL,
    "socialLink" TEXT,
    "city" TEXT,
    "venue" TEXT,
    "message" TEXT NOT NULL,
    "flyerUrl" TEXT,
    "status" "EventRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRequest_status_idx" ON "EventRequest"("status");

-- CreateIndex
CREATE INDEX "EventRequest_tentativeDate_idx" ON "EventRequest"("tentativeDate");

-- CreateIndex
CREATE INDEX "EventRequest_email_idx" ON "EventRequest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceRequestId_key" ON "Event"("sourceRequestId");

-- CreateIndex
CREATE INDEX "Event_visibility_idx" ON "Event"("visibility");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "EventRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
