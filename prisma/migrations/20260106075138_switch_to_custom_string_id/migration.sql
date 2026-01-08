/*
  Warnings:

  - The primary key for the `QiuDao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserRole` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "QiuDao" DROP CONSTRAINT "QiuDao_bao_shi_qd_id_fkey";

-- DropForeignKey
ALTER TABLE "QiuDao" DROP CONSTRAINT "QiuDao_yin_shi_qd_id_fkey";

-- DropForeignKey
ALTER TABLE "SpiritualUser" DROP CONSTRAINT "SpiritualUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_qiu_dao_id_fkey";

-- DropForeignKey
ALTER TABLE "UserCredential" DROP CONSTRAINT "UserCredential_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_user_id_fkey";

-- AlterTable
ALTER TABLE "QiuDao" DROP CONSTRAINT "QiuDao_pkey",
ALTER COLUMN "qiu_dao_id" DROP DEFAULT,
ALTER COLUMN "qiu_dao_id" SET DATA TYPE VARCHAR(16),
ALTER COLUMN "yin_shi_qd_id" SET DATA TYPE TEXT,
ALTER COLUMN "bao_shi_qd_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "QiuDao_pkey" PRIMARY KEY ("qiu_dao_id");
DROP SEQUENCE "QiuDao_qiu_dao_id_seq";

-- AlterTable
ALTER TABLE "SpiritualUser" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "user_info_id" DROP DEFAULT,
ALTER COLUMN "user_info_id" SET DATA TYPE VARCHAR(16),
ALTER COLUMN "qiu_dao_id" SET DATA TYPE VARCHAR(16),
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("user_info_id");
DROP SEQUENCE "User_user_info_id_seq";

-- AlterTable
ALTER TABLE "UserCredential" ALTER COLUMN "user_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_pkey",
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("user_id", "role_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_qiu_dao_id_fkey" FOREIGN KEY ("qiu_dao_id") REFERENCES "QiuDao"("qiu_dao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_info_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QiuDao" ADD CONSTRAINT "QiuDao_yin_shi_qd_id_fkey" FOREIGN KEY ("yin_shi_qd_id") REFERENCES "QiuDao"("qiu_dao_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QiuDao" ADD CONSTRAINT "QiuDao_bao_shi_qd_id_fkey" FOREIGN KEY ("bao_shi_qd_id") REFERENCES "QiuDao"("qiu_dao_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_info_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpiritualUser" ADD CONSTRAINT "SpiritualUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_info_id") ON DELETE RESTRICT ON UPDATE CASCADE;
