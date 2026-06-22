-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "featuredImageUrl" TEXT,
ADD COLUMN     "featuredOrder" INTEGER,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;
