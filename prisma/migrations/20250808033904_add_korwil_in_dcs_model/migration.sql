/*
  Warnings:

  - You are about to drop the column `spiritual_role` on the `SpiritualUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DianChuanShi" ADD COLUMN     "area" "Korwil";

-- AlterTable
ALTER TABLE "SpiritualUser" DROP COLUMN "spiritual_role";
