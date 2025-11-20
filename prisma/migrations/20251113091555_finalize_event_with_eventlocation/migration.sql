/*
  Warnings:

  - You are about to drop the column `area` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `Event` table. All the data in the column will be lost.
  - Added the required column `category` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('Internal', 'External');

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_locationId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "area",
DROP COLUMN "locationId",
ADD COLUMN     "category" "EventCategory" NOT NULL,
ADD COLUMN     "eventLocationId" INTEGER,
ADD COLUMN     "fotangId" INTEGER,
ADD COLUMN     "institutionId" INTEGER,
ADD COLUMN     "is_in_fotang" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "lunar_sui_ci_year" DROP NOT NULL,
ALTER COLUMN "lunar_month" DROP NOT NULL,
ALTER COLUMN "lunar_day" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EventLocation" (
    "event_location_id" SERIAL NOT NULL,
    "location_name" VARCHAR(250) NOT NULL,
    "cityId" INTEGER NOT NULL,
    "street" VARCHAR(250),
    "postal_code" VARCHAR(10),
    "area" "Korwil" NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "EventLocation_pkey" PRIMARY KEY ("event_location_id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_fotangId_fkey" FOREIGN KEY ("fotangId") REFERENCES "Fotang"("fotang_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_eventLocationId_fkey" FOREIGN KEY ("eventLocationId") REFERENCES "EventLocation"("event_location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("institution_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLocation" ADD CONSTRAINT "EventLocation_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
