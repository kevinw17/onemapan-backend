/*
  Warnings:

  - Made the column `area` on table `DianChuanShi` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DianChuanShi" ALTER COLUMN "area" SET NOT NULL;
