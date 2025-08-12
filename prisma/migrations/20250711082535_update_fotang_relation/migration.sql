-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A', 'B', 'O', 'AB');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('Married', 'Not_Married');

-- CreateEnum
CREATE TYPE "Korwil" AS ENUM ('Korwil_1', 'Korwil_2', 'Korwil_3', 'Korwil_4', 'Korwil_5', 'Korwil_6');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('Anniversary', 'Hari_Besar', 'Peresmian');

-- CreateTable
CREATE TABLE "User" (
    "user_info_id" SERIAL NOT NULL,
    "qiu_dao_id" INTEGER NOT NULL,
    "full_name" VARCHAR(250) NOT NULL,
    "mandarin_name" VARCHAR(4),
    "is_qing_kou" BOOLEAN NOT NULL,
    "gender" "Gender" NOT NULL,
    "blood_type" "BloodType",
    "place_of_birth" VARCHAR(250) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "date_of_death" DATE,
    "id_card_number" VARCHAR(20),
    "phone_number" CHAR(30) NOT NULL,
    "email" TEXT,
    "marital_status" "MaritalStatus",
    "last_education_level" VARCHAR(100),
    "education_major" VARCHAR(100),
    "job_name" VARCHAR(100),
    "biodata" BYTEA,
    "domicile_location_id" INTEGER NOT NULL,
    "id_card_location_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_info_id")
);

-- CreateTable
CREATE TABLE "QiuDao" (
    "qiu_dao_id" SERIAL NOT NULL,
    "qiu_dao_name" VARCHAR(250),
    "qiu_dao_mandarin_name" VARCHAR(250),
    "qiu_dao_location_id" INTEGER NOT NULL,
    "dian_chuan_shi_id" INTEGER,
    "yin_shi_qd_id" INTEGER,
    "yin_shi_qd_name" VARCHAR(250),
    "yin_shi_qd_mandarin_name" VARCHAR(4),
    "bao_shi_qd_id" INTEGER,
    "bao_shi_qd_name" VARCHAR(250),
    "bao_shi_qd_mandarin_name" VARCHAR(4),
    "lunar_sui_ci_year" VARCHAR(3) NOT NULL,
    "lunar_month" VARCHAR(4) NOT NULL,
    "lunar_day" VARCHAR(4) NOT NULL,
    "lunar_shi_chen_time" VARCHAR(2) NOT NULL,
    "qiu_dao_card_s3_url" VARCHAR(250),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "QiuDao_pkey" PRIMARY KEY ("qiu_dao_id")
);

-- CreateTable
CREATE TABLE "Location" (
    "location_id" SERIAL NOT NULL,
    "location_name" VARCHAR(250) NOT NULL,
    "location_mandarin_name" VARCHAR(20),
    "latitude" INTEGER,
    "longitude" INTEGER,
    "country_iso" CHAR(3) NOT NULL DEFAULT 'IDN',
    "localityId" INTEGER NOT NULL,
    "street" VARCHAR(250),
    "postal_code" VARCHAR(10),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "user_credential" SERIAL NOT NULL,
    "user_id" INTEGER,
    "username" VARCHAR(500) NOT NULL,
    "hashed_password" VARCHAR(500),
    "last_logged_in" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("user_credential")
);

-- CreateTable
CREATE TABLE "Fotang" (
    "fotang_id" SERIAL NOT NULL,
    "location_name" VARCHAR(250) NOT NULL,
    "location_mandarin_name" VARCHAR(20),
    "latitude" INTEGER,
    "longitude" INTEGER,
    "area" "Korwil" NOT NULL,
    "country_iso" CHAR(3) NOT NULL DEFAULT 'IDN',
    "localityId" INTEGER NOT NULL,
    "street" VARCHAR(250),
    "postal_code" VARCHAR(10),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Fotang_pkey" PRIMARY KEY ("fotang_id")
);

-- CreateTable
CREATE TABLE "DianChuanShi" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(250),
    "mandarin_name" VARCHAR(4),

    CONSTRAINT "DianChuanShi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locality" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,

    CONSTRAINT "Locality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "event_id" SERIAL NOT NULL,
    "event_type" "EventType" NOT NULL,
    "event_name" VARCHAR(200) NOT NULL,
    "event_mandarin_name" VARCHAR(200),
    "lunar_sui_ci_year" VARCHAR(3) NOT NULL,
    "lunar_month" VARCHAR(4) NOT NULL,
    "lunar_day" VARCHAR(4) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL,
    "description" VARCHAR(1000),
    "poster_s3_bucket_link" VARCHAR(250),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "Occurrence" (
    "occurrence_id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "greg_occur_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("occurrence_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_qiu_dao_id_key" ON "User"("qiu_dao_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_user_id_key" ON "UserCredential"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_username_key" ON "UserCredential"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_provinceId_key" ON "City"("name", "provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "District_name_cityId_key" ON "District"("name", "cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Locality_name_districtId_key" ON "Locality"("name", "districtId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_qiu_dao_id_fkey" FOREIGN KEY ("qiu_dao_id") REFERENCES "QiuDao"("qiu_dao_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_domicile_location_id_fkey" FOREIGN KEY ("domicile_location_id") REFERENCES "Location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_id_card_location_id_fkey" FOREIGN KEY ("id_card_location_id") REFERENCES "Location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QiuDao" ADD CONSTRAINT "QiuDao_qiu_dao_location_id_fkey" FOREIGN KEY ("qiu_dao_location_id") REFERENCES "Fotang"("fotang_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QiuDao" ADD CONSTRAINT "QiuDao_dian_chuan_shi_id_fkey" FOREIGN KEY ("dian_chuan_shi_id") REFERENCES "DianChuanShi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QiuDao" ADD CONSTRAINT "QiuDao_yin_shi_qd_id_fkey" FOREIGN KEY ("yin_shi_qd_id") REFERENCES "QiuDao"("qiu_dao_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QiuDao" ADD CONSTRAINT "QiuDao_bao_shi_qd_id_fkey" FOREIGN KEY ("bao_shi_qd_id") REFERENCES "QiuDao"("qiu_dao_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_info_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fotang" ADD CONSTRAINT "Fotang_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "Locality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locality" ADD CONSTRAINT "Locality_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE RESTRICT ON UPDATE CASCADE;
