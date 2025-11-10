-- AlterTable
ALTER TABLE "DianChuanShi" ADD COLUMN     "ling_ming_time" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Institution" (
    "institution_id" SERIAL NOT NULL,
    "institution_name" VARCHAR(250) NOT NULL,
    "institution_leader" VARCHAR(250) NOT NULL,
    "institution_secretary_general" VARCHAR(250),

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("institution_id")
);
