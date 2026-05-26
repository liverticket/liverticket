/*
  Warnings:

  - You are about to drop the column `socialLink` on the `EventRequest` table. All the data in the column will be lost.
  - Made the column `eventTime` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `minAge` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `eventTime` on table `EventRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `minAge` on table `EventRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "eventTime" SET NOT NULL,
ALTER COLUMN "minAge" SET NOT NULL;

-- AlterTable
ALTER TABLE "EventRequest" DROP COLUMN "socialLink",
ALTER COLUMN "eventTime" SET NOT NULL,
ALTER COLUMN "minAge" SET NOT NULL;
