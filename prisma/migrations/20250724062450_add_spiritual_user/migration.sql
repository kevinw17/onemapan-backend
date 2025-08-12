-- CreateEnum
CREATE TYPE "SpiritualStatus" AS ENUM ('QianRen', 'DianChuanShi', 'TanZhu', 'FoYuan', 'BanShiYuan', 'QianXian', 'DaoQin');

-- CreateTable
CREATE TABLE "SpiritualUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "spiritual_status" "SpiritualStatus" NOT NULL,
    "spiritual_role" TEXT,
    "role_start" TIMESTAMP(3),
    "role_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpiritualUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpiritualUser_userId_key" ON "SpiritualUser"("userId");

-- AddForeignKey
ALTER TABLE "SpiritualUser" ADD CONSTRAINT "SpiritualUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_info_id") ON DELETE RESTRICT ON UPDATE CASCADE;
