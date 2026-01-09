import ExcelJS from "exceljs";
import { getLocalityId, getOrCreateLocation } from "../profile/location/location.repository";
import { createQiuDao } from "../profile/qiudao/qiudao.repository";
import { createUser } from "../profile/user/user.repository";
import prisma from "../db";
import { CellValue } from "exceljs";
import { BloodType, Gender, Korwil, MaritalStatus, Prisma, SpiritualStatus } from "@prisma/client";
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

function safeParseKorwil(value?: string): Korwil | undefined {
    if (!value) return undefined;

    const cleaned = value.trim().toLowerCase()
        .replace("wilayah", "")
        .replace(/\s+/g, "")
        .replace("_", "");

    const num = parseInt(cleaned, 10);
    if (isNaN(num) || num < 1 || num > 6) return undefined;

    return `Korwil_${num}` as Korwil;
}

async function getFotang(data: {
    location_name?: string;
    location_mandarin_name?: string;
    area?: Korwil;
}): Promise<Fotang | null> {
    const { location_name, location_mandarin_name, area } = data;

    if (!location_name && !location_mandarin_name) return null;

    const orConditions: Prisma.FotangWhereInput["OR"] = [];

    if (location_name) {
        orConditions.push({
            location_name: {
                equals: location_name.trim(),
                mode: "insensitive",
            },
        });
    }

    if (location_mandarin_name) {
        orConditions.push({
            location_mandarin_name: {
                equals: location_mandarin_name.trim(),
                mode: "insensitive",
            },
        });
    }

    if (area && orConditions.length > 0) {
        const exactMatch = await prisma.fotang.findFirst({
            where: {
                AND: [
                    { area },
                    { OR: orConditions },
                ],
            },
        });
        if (exactMatch) return exactMatch;
    }

    return await prisma.fotang.findFirst({
        where: {
            OR: orConditions,
        },
    });
}

function getCellValue(row: ExcelJS.Row, headerMap: Record<string, number>, headerName: string): CellValue {
    const col = headerMap[headerName];
    if (!col) return undefined;
    return row.getCell(col).value;
}

export const importUmatFromExcel = async (buffer: Buffer | ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();
    let data: Buffer | Uint8Array;

    if (Buffer.isBuffer(buffer)) {
        data = buffer;
    } else {
        data = new Uint8Array(buffer);
    }

    await workbook.xlsx.load(data as any);

    const umatSheet = workbook.getWorksheet("Umat");
    if (!umatSheet) throw new Error("Sheet 'Umat' tidak ditemukan");

    const headerMap: Record<string, number> = {};
    const headerRow = umatSheet.getRow(1);
    const values = headerRow.values;

    if (Array.isArray(values)) {
        values.forEach((value, index) => {
            if (index >= 1 && typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed) {
                    headerMap[trimmed] = index;
                }
            }
        });
    } else if (values && typeof values === "object") {
        Object.keys(values).forEach(key => {
            const colIndex = parseInt(key);
            const value = (values as any)[key];
            if (!isNaN(colIndex) && colIndex >= 1 && typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed) {
                    headerMap[trimmed] = colIndex;
                }
            }
        });
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let rowIndex = 2; rowIndex <= umatSheet.rowCount; rowIndex++) {
        const row = umatSheet.getRow(rowIndex);

        try {
            const getVal = (header: string): CellValue => {
                const col = headerMap[header];
                if (!col) return undefined;
                return row.getCell(col).value;
            };

            const fullName = safeString(getVal("Nama Lengkap"));
            const mandarinName = safeString(getVal("Nama Mandarin"));
            const qdName = safeString(getVal("Nama Qiudao"));
            const qdMandarinName = safeString(getVal("Nama Qiudao (Mandarin)"));
            const genderStr = safeString(getVal("Jenis Kelamin"));
            const bloodTypeStr = safeString(getVal("Golongan Darah"));
            const placeOfBirth = safeString(getVal("Tempat Lahir")) ?? "-";
            const dateOfBirthStr = getVal("Tanggal Lahir");
            const dateOfDeathStr = getVal("Tanggal Wafat");
            const idCardNumber = safeString(getVal("No. KTP"));
            const phoneNumber = safeString(getVal("No. HP"));
            const email = safeString(getVal("Email"));
            const maritalStatusStr = safeString(getVal("Status Perkawinan"));
            const educationLevel = safeString(getVal("Pendidikan Terakhir"));
            const educationMajor = safeString(getVal("Jurusan Pendidikan"));
            const jobName = safeString(getVal("Pekerjaan"));
            const isQingKouStr = safeString(getVal("Status Vegetarian"));
            const spiritualStatusStr = safeString(getVal("Status Rohani"));

            if (!fullName || !genderStr || !dateOfBirthStr || (!qdName && !qdMandarinName)) {
                skipCount++;
                console.log(`Baris ${rowIndex}: Skip - data wajib kosong`);
                continue;
            }

            const gender = parseGender(genderStr);

            const dateOfBirth = new Date(String(dateOfBirthStr));
            if (isNaN(dateOfBirth.getTime())) {
                skipCount++;
                console.log(`Baris ${rowIndex}: Tanggal lahir tidak valid`);
                continue;
            }

            const bloodType = bloodTypeStr ? parseBloodType(bloodTypeStr) : null;
            const maritalStatus = maritalStatusStr ? parseMaritalStatus(maritalStatusStr) : null;
            const spiritualStatus = spiritualStatusStr ? parseSpiritualStatus(spiritualStatusStr) : null;
            const qingKouLower = String(isQingKouStr || "").toLowerCase().trim();
            const isQingKou = ["ya", "sudah", "vegetarian", "qingkou", "v"].includes(qingKouLower);

            let dateOfDeath: Date | null = null;
            if (dateOfDeathStr) {
                const parsed = new Date(String(dateOfDeathStr));
                if (!isNaN(parsed.getTime())) {
                    dateOfDeath = parsed;
                }
            }

            let qiuDao = null;
            if (qdMandarinName) {
                qiuDao = await prisma.qiuDao.findFirst({
                    where: { qiu_dao_mandarin_name: { equals: qdMandarinName, mode: "insensitive" } },
                });
            }
            if (!qiuDao && qdName) {
                qiuDao = await prisma.qiuDao.findFirst({
                    where: { qiu_dao_name: { equals: qdName, mode: "insensitive" } },
                });
            }

            if (!qiuDao) {
                skipCount++;
                console.log(`Baris ${rowIndex}: Qiudao tidak ditemukan`);
                continue;
            }

            if (await prisma.user.findUnique({ where: { qiu_dao_id: qiuDao.qiu_dao_id } })) {
                skipCount++;
                console.log(`Baris ${rowIndex}: User sudah ada`);
                continue;
            }

            const domStreet = safeString(getVal("Alamat Domisili"));
            const domKel = safeString(getVal("Desa / Kelurahan Domisili"));
            const domKec = safeString(getVal("Kecamatan Domisili"));
            const domKota = safeString(getVal("Kabupaten / Kota Domisili"));
            const domProv = safeString(getVal("Provinsi Domisili"));
            const domPos = safeString(getVal("Kode Pos Domisili"));

            let domicileLocation;
            if (domKel || domKec || domKota || domProv) {
                const localityId = await getLocalityId({
                    name: domKel,
                    districtName: domKec,
                    cityName: domKota,
                    provinceName: domProv,
                });
                domicileLocation = await getOrCreateLocation({
                    location_name: "-",
                    street: domStreet || undefined,
                    localityId,
                    postal_code: domPos || undefined,
                });
            } else {
                domicileLocation = await getOrCreateLocation({
                    location_name: "-",
                    street: undefined,
                    localityId: 1,
                    postal_code: undefined,
                });
            }

            const ktpStreet = safeString(getVal("Alamat Sesuai KTP"));
            const ktpKel = safeString(getVal("Desa / Kelurahan Sesuai KTP"));
            const ktpKec = safeString(getVal("Kecamatan Sesuai KTP"));
            const ktpKota = safeString(getVal("Kabupaten / Kota Sesuai KTP"));
            const ktpProv = safeString(getVal("Provinsi Sesuai KTP"));
            const ktpPos = safeString(getVal("Kode Pos Sesuai KTP"));

            let idCardLocation;
            if (ktpKel || ktpKec || ktpKota || ktpProv) {
                const localityId = await getLocalityId({
                    name: ktpKel,
                    districtName: ktpKec,
                    cityName: ktpKota,
                    provinceName: ktpProv,
                });
                idCardLocation = await getOrCreateLocation({
                    location_name: "-",
                    street: ktpStreet || undefined,
                    localityId,
                    postal_code: ktpPos || undefined,
                });
            } else {
                idCardLocation = await getOrCreateLocation({
                    location_name: "-",
                    street: undefined,
                    localityId: 1,
                    postal_code: undefined,
                });
            }

            await createUser({
                user_info_id: qiuDao.qiu_dao_id,
                full_name: fullName,
                mandarin_name: mandarinName || null,
                is_qing_kou: isQingKou,
                gender,
                blood_type: bloodType,
                place_of_birth: placeOfBirth,
                date_of_birth: dateOfBirth,
                date_of_death: dateOfDeath,
                id_card_number: idCardNumber || null,
                phone_number: phoneNumber || null,
                email: email || null,
                marital_status: maritalStatus,
                last_education_level: educationLevel || null,
                education_major: educationMajor || null,
                job_name: jobName || null,
                domicile_location: { connect: { location_id: domicileLocation.location_id } },
                id_card_location: { connect: { location_id: idCardLocation.location_id } },
                qiudao: { connect: { qiu_dao_id: qiuDao.qiu_dao_id } },
                spiritualUser: spiritualStatus ? { create: { spiritual_status: spiritualStatus } } : undefined,
            });

            successCount++;
        } catch (err: any) {
            console.error(`Error baris ${rowIndex}:`, err.message);
            errorCount++;
        }
    }

    return {
        message: `Import Umat selesai: ${successCount} berhasil, ${skipCount} dilewati, ${errorCount} error`,
    };
};

export const importQiudaoFromExcel = async (buffer: Buffer | ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();

    const data: Buffer | Uint8Array = Buffer.isBuffer(buffer)
        ? buffer
        : new Uint8Array(buffer);

    await workbook.xlsx.load(data as any);

    const sheet = workbook.getWorksheet("Qiudao");
    if (!sheet) throw new Error("Sheet 'Qiudao' tidak ditemukan");

    const headerMap: Record<string, number> = {};
    const headerRow = sheet.getRow(1);

    const values = headerRow.values;

    if (Array.isArray(values)) {
        values.forEach((value, index) => {
            if (index >= 1 && typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed) {
                    headerMap[trimmed] = index;
                }
            }
        });
    } else if (values && typeof values === "object") {
        Object.keys(values).forEach(key => {
            const colIndex = parseInt(key);
            const value = (values as any)[key];
            if (!isNaN(colIndex) && colIndex >= 1 && typeof value === "string") {
                const trimmed = value.trim();
                if (trimmed) {
                    headerMap[trimmed] = colIndex;
                }
            }
        });
    }

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);

        try {
            const qiu_dao_name = safeString(getCellValue(row, headerMap, "Nama Qiudao (Indonesia)"));
            const qiu_dao_mandarin_name = safeString(getCellValue(row, headerMap, "Nama Qiudao (Mandarin)"));
            const location_name = safeString(getCellValue(row, headerMap, "Nama Vihara"));
            const location_mandarin_name = safeString(getCellValue(row, headerMap, "Nama Vihara (Mandarin)"));
            const rawWilayah = safeString(getCellValue(row, headerMap, "Wilayah"));
            const dian_chuan_shi_name = safeString(getCellValue(row, headerMap, "Nama Indonesia Pandita"));
            const dian_chuan_shi_mandarin_name = safeString(getCellValue(row, headerMap, "Nama Mandarin Pandita"));
            const yin_shi_qd_name = safeString(getCellValue(row, headerMap, "Nama Indonesia Guru Pengajak"));
            const yin_shi_qd_mandarin_name = safeString(getCellValue(row, headerMap, "Nama Mandarin Guru Pengajak"));
            const bao_shi_qd_name = safeString(getCellValue(row, headerMap, "Nama Indonesia Guru Penanggung"));
            const bao_shi_qd_mandarin_name = safeString(getCellValue(row, headerMap, "Nama Mandarin Guru Penanggung"));
            const lunar_sui_ci_year = safeString(getCellValue(row, headerMap, "Tahun Lunar"));
            const lunar_month = safeString(getCellValue(row, headerMap, "Bulan Lunar"));
            const lunar_day = safeString(getCellValue(row, headerMap, "Tanggal Lunar"));
            const lunar_shi_chen_time = safeString(getCellValue(row, headerMap, "Waktu Lunar"));

            if (!qiu_dao_name && !qiu_dao_mandarin_name) {
                errorCount++;
                console.log(`Baris ${i}: Nama Qiudao kosong`);
                continue;
            }

            if (!lunar_sui_ci_year || !lunar_month || !lunar_day || !lunar_shi_chen_time) {
                errorCount++;
                console.log(`Baris ${i}: Data lunar tidak lengkap`);
                continue;
            }

            const area = safeParseKorwil(rawWilayah);

            const fotang = await getFotang({
                location_name,
                location_mandarin_name,
                area,
            });

            if (!fotang) {
                errorCount++;
                console.log(`Baris ${i}: Vihara tidak ditemukan → "${location_name}" / "${location_mandarin_name}" (Wilayah: "${rawWilayah}")`);
                continue;
            }

            const orConditions: Prisma.QiuDaoWhereInput[] = [];
            if (qiu_dao_name) {
                orConditions.push({ qiu_dao_name: { equals: qiu_dao_name, mode: "insensitive" } });
            }
            if (qiu_dao_mandarin_name) {
                orConditions.push({ qiu_dao_mandarin_name: { equals: qiu_dao_mandarin_name, mode: "insensitive" } });
            }

            const existing = await prisma.qiuDao.findFirst({
                where: {
                    qiu_dao_location_id: fotang.fotang_id,
                    OR: orConditions,
                },
            });

            if (existing) {
                duplicateCount++;
                console.log(`Baris ${i}: Duplikat → ${qiu_dao_name || qiu_dao_mandarin_name}`);
                continue;
            }

            const pandita = await prisma.dianChuanShi.findFirst({
                where: {
                    OR: [
                        dian_chuan_shi_name ? { name: { equals: dian_chuan_shi_name, mode: "insensitive" } } : null,
                        dian_chuan_shi_mandarin_name ? { mandarin_name: { equals: dian_chuan_shi_mandarin_name, mode: "insensitive" } } : null,
                    ].filter(Boolean) as any,
                },
            });

            if (!pandita) {
                errorCount++;
                console.log(`Baris ${i}: Pandita tidak ditemukan → "${dian_chuan_shi_name}" / "${dian_chuan_shi_mandarin_name}"`);
                continue;
            }

            const korwilDigit = fotang.area.replace("Korwil_", "");
            const viharaIdPadded = fotang.fotang_id.toString().padStart(4, "0");

            const totalInVihara = await prisma.qiuDao.count({
                where: { qiu_dao_location_id: fotang.fotang_id },
            });

            const seriIndex = Math.floor(totalInVihara / 999999);
            const seriAlpha = String.fromCharCode(65 + seriIndex);
            const urutanDalamSeri = (totalInVihara % 999999) + 1;
            const nomorUrut = urutanDalamSeri.toString().padStart(6, "0");

            const generatedQiuDaoId = `${korwilDigit}${viharaIdPadded}-${seriAlpha}${nomorUrut}`;

            await createQiuDao({
                qiu_dao_id: generatedQiuDaoId,
                qiu_dao_name,
                qiu_dao_mandarin_name,
                qiu_dao_location: { connect: { fotang_id: fotang.fotang_id } },
                dian_chuan_shi: { connect: { id: pandita.id } },
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
            console.log(`Baris ${i}: Berhasil → ${qiu_dao_name || qiu_dao_mandarin_name} di ${fotang.location_name}`);

        } catch (err: any) {
            console.error(`Error import baris ${i}:`, err.message);
            errorCount++;
        }
    }

    const totalProcessed = successCount + duplicateCount + errorCount;
    return {
        message: `Import Qiudao selesai: ${successCount} berhasil, ${duplicateCount} duplikat dilewati, ${errorCount} gagal (dari ${totalProcessed} entri)`,
    };
};