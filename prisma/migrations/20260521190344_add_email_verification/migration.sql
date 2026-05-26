/*
  Warnings:

  - You are about to drop the column `ageMax` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `ageMin` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `ageMax` on the `EventRequest` table. All the data in the column will be lost.
  - You are about to drop the column `ageMin` on the `EventRequest` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[verificationToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "ageMax",
DROP COLUMN "ageMin",
ADD COLUMN     "eventTime" TEXT,
ADD COLUMN     "minAge" INTEGER;

-- AlterTable
ALTER TABLE "EventRequest" DROP COLUMN "ageMax",
DROP COLUMN "ageMin",
ADD COLUMN     "eventTime" TEXT,
ADD COLUMN     "minAge" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- CreateIndex
CREATE INDEX "User_verificationToken_idx" ON "User"("verificationToken");
