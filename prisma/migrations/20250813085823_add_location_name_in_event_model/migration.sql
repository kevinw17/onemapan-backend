/*
  Warnings:

  - Added the required column `location_name` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "location_name" VARCHAR(200) NOT NULL;
