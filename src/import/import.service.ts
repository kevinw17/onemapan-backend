import ExcelJS from "exceljs";
import { getLocalityId, getOrCreateLocation } from "../profile/location/location.repository";
import { createQiuDao } from "../profile/qiudao/qiudao.repository";
import { createUser } from "../profile/user/user.repository";
import prisma from "../db";
import { CellValue } from "exceljs";
import { BloodType, Gender, Korwil, MaritalStatus, SpiritualStatus } from "@prisma/client";
import { Fotang } from "@prisma/client";
import { Buffer } from "buffer"; 

function safeString(val: CellValue | undefined | null): string | undefined {
    return val ? String(val).trim() : undefined;
}

function parseGender(value?: string): Gender {
    const val = (value ?? "").toLowerCase();
    if (val === "pria" || val === "male") return Gender.Male;
    if (val === "wanita" || val === "female") return Gender.Female;
    throw new Error(`Gender tidak valid: '${value}'`);
}

function parseBloodType(value?: string): BloodType {
    const val = (value ?? "").toUpperCase();
    if (["A", "B", "AB", "O"].includes(val)) return val as BloodType;
    throw new Error(`Golongan darah tidak valid: '${value}'`);
}

function parseMaritalStatus(value?: string): MaritalStatus {
    const val = (value ?? "").toLowerCase();
    if (val === "sudah menikah" || val === "married") return MaritalStatus.Married;
    if (val === "belum menikah" || val === "not_married") return MaritalStatus.Not_Married;
    throw new Error(`Status perkawinan tidak valid: '${value}'`);
}

function parseSpiritualStatus(value?: string): SpiritualStatus {
    const val = (value ?? "").toLowerCase();
    if (val === "qianren") return SpiritualStatus.QianRen;
    if (val === "dianchuanshi") return SpiritualStatus.DianChuanShi;
    if (val === "tanzhu") return SpiritualStatus.TanZhu;
    if (val === "foyuan") return SpiritualStatus.FoYuan;
    if (val === "banshiyuan") return SpiritualStatus.BanShiYuan;
    if (val === "qianxian") return SpiritualStatus.QianXian;
    if (val === "daoqin") return SpiritualStatus.DaoQin;
    throw new Error(`Status rohani tidak valid: '${value}'`);
}

export function parseKorwil(value?: string): Korwil {
    const val = (value ?? "").trim().replace(/\s+/g, "_");
    const korwil = val[0].toUpperCase() + val.slice(1);
    if (Object.values(Korwil).includes(korwil as Korwil)) {
        return korwil as Korwil;
    }
    throw new Error(`Korwil tidak valid: '${value}'`);
}

async function getFotang(data: {
    location_name: string;
    localityId: number;
    postal_code?: string;
    area: Korwil;
}): Promise<Fotang | null> {
    const { location_name, localityId, postal_code, area } = data;
    const existingFotang = await prisma.fotang.findFirst({
        where: {
            location_name: {
                equals: location_name,
                mode: "insensitive",
            },
            localityId: localityId,
            postal_code: postal_code,
            area: area,
        },
    });

    if (!existingFotang) {
        const fallbackFotang = await prisma.fotang.findFirst({
            where: {
                location_name: {
                    equals: location_name,
                    mode: "insensitive",
                },
            },
        });
        if (fallbackFotang) {
            return fallbackFotang;
        }
    }
    return existingFotang;
}

export const importUmatFromExcel = async (buffer: Buffer | ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();
    const normalizedBuffer = Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from(new Uint8Array(buffer as ArrayBuffer));
    // @ts-ignore
    await workbook.xlsx.load(normalizedBuffer);

    const umatSheet = workbook.getWorksheet("Umat");
    if (!umatSheet) throw new Error("Sheet 'Umat' tidak ditemukan");

    const headerMap: Record<string, number> = {};
    umatSheet.getRow(1).eachCell((cell, colNumber) => {
        if (typeof cell.value === "string") {
            headerMap[cell.value] = colNumber;
        }
    });

    for (let i = 2; i <= umatSheet.rowCount; i++) {
        const row = umatSheet.getRow(i);

        const domicileLocation = await getOrCreateLocation({
            location_name: safeString(row.getCell(headerMap["Nama Lokasi Domisili"])?.value) ?? "-",
            street: safeString(row.getCell(headerMap["Alamat Domisili"])?.value),
            localityId: await getLocalityId({
                name: safeString(row.getCell(headerMap["Desa / Kelurahan Domisili"])?.value),
                districtName: safeString(row.getCell(headerMap["Kecamatan Domisili"])?.value),
                cityName: safeString(row.getCell(headerMap["Kabupaten / Kota Domisili"])?.value),
                provinceName: safeString(row.getCell(headerMap["Provinsi Domisili"])?.value),
            }),
            postal_code: safeString(row.getCell(headerMap["Kode Pos Domisili"])?.value),
        });

        const idCardLocation = await getOrCreateLocation({
            location_name: safeString(row.getCell(headerMap["Nama Lokasi Sesuai KTP"])?.value) ?? "-",
            street: safeString(row.getCell(headerMap["Alamat Sesuai KTP"])?.value),
            localityId: await getLocalityId({
                name: safeString(row.getCell(headerMap["Desa / Kelurahan Sesuai KTP"])?.value),
                districtName: safeString(row.getCell(headerMap["Kecamatan Sesuai KTP"])?.value),
                cityName: safeString(row.getCell(headerMap["Kabupaten / Kota Sesuai KTP"])?.value),
                provinceName: safeString(row.getCell(headerMap["Provinsi Sesuai KTP"])?.value),
            }),
            postal_code: safeString(row.getCell(headerMap["Kode Pos Sesuai KTP"])?.value),
        });

        if (!domicileLocation || !idCardLocation) {
            continue;
        }

        const qdMandarinName = safeString(row.getCell(headerMap["Nama Qiudao (Mandarin)"])?.value);
        const qdName = safeString(row.getCell(headerMap["Nama Qiudao"])?.value);

        let qiuDao = null;

        if (qdMandarinName) {
            qiuDao = await prisma.qiuDao.findFirst({
                where: { qiu_dao_mandarin_name: qdMandarinName },
            });
        }

        if (!qiuDao && qdName) {
            qiuDao = await prisma.qiuDao.findFirst({
                where: { qiu_dao_name: qdName },
            });
        }

        if (qiuDao) {
            const existingUserWithQiuDao = await prisma.user.findFirst({
                where: { qiu_dao_id: qiuDao.qiu_dao_id },
            });

            if (existingUserWithQiuDao) {
                continue;
            }
        }

        if (!qiuDao) {
            continue;
        }

        await createUser({
            full_name: safeString(row.getCell(headerMap["Nama Lengkap"])?.value) ?? "-",
            mandarin_name: safeString(row.getCell(headerMap["Nama Mandarin"])?.value),
            is_qing_kou: String(row.getCell(headerMap["Status Vegetarian"])?.value || "").toLowerCase() === "ya",
            gender: parseGender(safeString(row.getCell(headerMap["Jenis Kelamin"])?.value)),
            blood_type: parseBloodType(safeString(row.getCell(headerMap["Golongan Darah"])?.value)),
            place_of_birth: safeString(row.getCell(headerMap["Tempat Lahir"])?.value) ?? "-",
            date_of_birth: new Date(String(row.getCell(headerMap["Tanggal Lahir"])?.value)),
            date_of_death: row.getCell(headerMap["Tanggal Wafat"])?.value
                ? new Date(String(row.getCell(headerMap["Tanggal Wafat"])?.value))
                : null,
            id_card_number: safeString(row.getCell(headerMap["No. KTP"])?.value),
            phone_number: safeString(row.getCell(headerMap["No. HP"])?.value) ?? "-",
            email: safeString(row.getCell(headerMap["Email"])?.value),
            marital_status: parseMaritalStatus(safeString(row.getCell(headerMap["Status Perkawinan"])?.value)),
            last_education_level: safeString(row.getCell(headerMap["Pendidikan Terakhir"])?.value),
            education_major: safeString(row.getCell(headerMap["Jurusan Pendidikan"])?.value),
            job_name: safeString(row.getCell(headerMap["Pekerjaan"])?.value),
            domicile_location: {
                connect: { location_id: domicileLocation.location_id },
            },
            id_card_location: {
                connect: { location_id: idCardLocation.location_id },
            },
            qiudao: {
                connect: { qiu_dao_id: qiuDao.qiu_dao_id },
            },
            spiritualUser: {
                create: {
                    spiritual_status: parseSpiritualStatus(
                        safeString(row.getCell(headerMap["Status Rohani"])?.value)
                    ),
                },
            },
        });
    }

    return { message: "Import selesai" };
};

export const importQiudaoFromExcel = async (buffer: Buffer | ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();
    const normalizedBuffer = Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from(new Uint8Array(buffer as ArrayBuffer));
    // @ts-ignore
    await workbook.xlsx.load(normalizedBuffer);

    const sheet = workbook.getWorksheet("Qiudao");
    if (!sheet) throw new Error("Sheet 'Qiudao' tidak ditemukan");

    const headerMap: Record<string, number> = {};
    sheet.getRow(1).eachCell((cell, colNumber) => {
        if (typeof cell.value === "string") {
            headerMap[cell.value] = colNumber;
        }
    });

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);

        const qiu_dao_name = safeString(row.getCell(headerMap["Nama Qiudao (Indonesia)"])?.value);
        const qiu_dao_mandarin_name = safeString(row.getCell(headerMap["Nama Qiudao (Mandarin)"])?.value);
        const dian_chuan_shi_name = safeString(row.getCell(headerMap["Nama Indonesia Pandita"])?.value);
        const dian_chuan_shi_mandarin_name = safeString(row.getCell(headerMap["Nama Mandarin Pandita"])?.value);
        const yin_shi_qd_name = safeString(row.getCell(headerMap["Nama Indonesia Guru Pengajak"])?.value);
        const yin_shi_qd_mandarin_name = safeString(row.getCell(headerMap["Nama Mandarin Guru Pengajak"])?.value);
        const bao_shi_qd_name = safeString(row.getCell(headerMap["Nama Indonesia Guru Penanggung"])?.value);
        const bao_shi_qd_mandarin_name = safeString(row.getCell(headerMap["Nama Mandarin Guru Penanggung"])?.value);
        const lunar_sui_ci_year = safeString(row.getCell(headerMap["Tahun Lunar"])?.value);
        const lunar_month = safeString(row.getCell(headerMap["Bulan Lunar"])?.value);
        const lunar_day = safeString(row.getCell(headerMap["Tanggal Lunar"])?.value);
        const lunar_shi_chen_time = safeString(row.getCell(headerMap["Waktu Lunar"])?.value);

        if (!lunar_sui_ci_year || !lunar_month || !lunar_day || !lunar_shi_chen_time) {
            errorCount++;
            continue;
        }

        const locationData = {
            location_name: safeString(row.getCell(headerMap["Nama Vihara"])?.value) ?? "-",
            localityId: await getLocalityId({
                name: safeString(row.getCell(headerMap["Desa / Kelurahan"])?.value),
                districtName: safeString(row.getCell(headerMap["Kecamatan"])?.value),
                cityName: safeString(row.getCell(headerMap["Kabupaten / Kota"])?.value),
                provinceName: safeString(row.getCell(headerMap["Provinsi"])?.value),
            }),
            postal_code: safeString(row.getCell(headerMap["Kode Pos"])?.value),
            area: parseKorwil(safeString(row.getCell(headerMap["Wilayah"])?.value)) || "Korwil_1",
        };

        const location = await getFotang(locationData);
        if (!location) {
            errorCount++;
            continue;
        }

        const existing = await prisma.qiuDao.findFirst({
            where: {
                qiu_dao_name,
                qiu_dao_mandarin_name,
                qiu_dao_location_id: location.fotang_id,
                dian_chuan_shi: {
                    name: dian_chuan_shi_name,
                    mandarin_name: dian_chuan_shi_mandarin_name,
                },
                yin_shi_qd_name,
                yin_shi_qd_mandarin_name,
                bao_shi_qd_name,
                bao_shi_qd_mandarin_name,
                lunar_sui_ci_year,
                lunar_month,
                lunar_day,
                lunar_shi_chen_time,
            },
        });

        if (existing) {
            duplicateCount++;
            continue;
        }

        const pandita = await prisma.dianChuanShi.findFirst({
            where: {
                OR: [
                    { name: dian_chuan_shi_name },
                    { mandarin_name: dian_chuan_shi_mandarin_name },
                ],
            },
        });

        if (!pandita) {
            errorCount++;
            continue;
        }

        try {
            await createQiuDao({
                qiu_dao_name,
                qiu_dao_mandarin_name,
                qiu_dao_location: {
                    connect: { fotang_id: location.fotang_id },
                },
                dian_chuan_shi: {
                    connect: { id: pandita.id },
                },
                yin_shi_qd_name,
                yin_shi_qd_mandarin_name,
                bao_shi_qd_name,
                bao_shi_qd_mandarin_name,
                lunar_sui_ci_year,
                lunar_month,
                lunar_day,
                lunar_shi_chen_time,
            });
            successCount++;
        } catch (error) {
            errorCount++;
            continue;
        }
    }

    const totalProcessed = successCount + duplicateCount + errorCount;
    return {
        message: `Import selesai: ${successCount} berhasil, ${duplicateCount} duplikat dilewati, ${errorCount} gagal (dari ${totalProcessed} total entri)`,
    };
};