/*
  Warnings:

  - Added the required column `userId` to the `EventRequest` table without a default value. This is not possible if the table is not empty.
  - Made the column `socialLink` on table `EventRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `EventRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `venue` on table `EventRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `flyerUrl` on table `EventRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EventRequest" ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "socialLink" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "venue" SET NOT NULL,
ALTER COLUMN "flyerUrl" SET NOT NULL;

-- CreateIndex
CREATE INDEX "EventRequest_userId_idx" ON "EventRequest"("userId");

-- AddForeignKey
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
