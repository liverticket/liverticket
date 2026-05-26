-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "venue" TEXT;

-- AlterTable
ALTER TABLE "EventRequest" ADD COLUMN     "address" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateIndex
CREATE INDEX "EventRequest_city_idx" ON "EventRequest"("city");

-- CreateIndex
CREATE INDEX "EventRequest_region_idx" ON "EventRequest"("region");
