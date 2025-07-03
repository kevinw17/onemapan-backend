import ExcelJS from "exceljs";
import { getOrCreateLocation } from "../profile/location/location.repository.js";
import { createQiuDao } from "../profile/qiudao/qiudao.repository.js";
import { createUser } from "../profile/user/user.repository.js";
import prisma from "../db/index.js";

const safeString = (val) => (val ? String(val).trim() : undefined);

export const importUmatFromExcel = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const umatSheet = workbook.getWorksheet("Umat");
    if (!umatSheet) throw new Error("Sheet 'Umat' tidak ditemukan");

    const headerRow = umatSheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
        headerMap[cell.value] = colNumber;
    });

    for (let i = 2; i <= umatSheet.rowCount; i++) {
        const row = umatSheet.getRow(i);

        const domicileLocation = await getOrCreateLocation({
            location_name: safeString(row.getCell(headerMap["Nama Lokasi Domisili"]).value),
            street: safeString(row.getCell(headerMap["Alamat Domisili"]).value),
            locality: safeString(row.getCell(headerMap["Kelurahan Domisili"]).value),
            district: safeString(row.getCell(headerMap["Kecamatan Domisili"]).value),
            city: safeString(row.getCell(headerMap["Kota Domisili"]).value),
            province: safeString(row.getCell(headerMap["Provinsi Domisili"]).value),
            postal_code: safeString(row.getCell(headerMap["Kode Pos Domisili"]).value),
            area: "Home",
            location_type: "Home",
        });

        const idCardLocation = await getOrCreateLocation({
            location_name: safeString(row.getCell(headerMap["Nama Lokasi Sesuai KTP"]).value),
            street: safeString(row.getCell(headerMap["Alamat Sesuai KTP"]).value),
            locality: safeString(row.getCell(headerMap["Kelurahan Sesuai KTP"]).value),
            district: safeString(row.getCell(headerMap["Kecamatan Sesuai KTP"]).value),
            city: safeString(row.getCell(headerMap["Kota Sesuai KTP"]).value),
            province: safeString(row.getCell(headerMap["Provinsi Sesuai KTP"]).value),
            postal_code: safeString(row.getCell(headerMap["Kode Pos Sesuai KTP"]).value),
            area: "Home",
            location_type: "Home",
        });

        const qdMandarinName = safeString(row.getCell(headerMap["Nama Qiudao (Mandarin)"]).value);
        const qdName = safeString(row.getCell(headerMap["Nama Qiudao"]).value);

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
                console.log(`Baris ${i} dilewati: qiudao_id '${qiuDao.qiu_dao_id}' sudah dipakai.`);
                continue;
            }
        }

        const user = {
            full_name: safeString(row.getCell(headerMap["Nama Lengkap"]).value),
            mandarin_name: safeString(row.getCell(headerMap["Nama Mandarin"]).value),
            is_qing_kou: String(row.getCell(headerMap["Status Vegetarian"]).value || "").toLowerCase() === "ya",
            gender: safeString(row.getCell(headerMap["Jenis Kelamin"]).value),
            blood_type: safeString(row.getCell(headerMap["Golongan Darah"]).value),
            place_of_birth: safeString(row.getCell(headerMap["Tempat Lahir"]).value),
            date_of_birth: new Date(row.getCell(headerMap["Tanggal Lahir"]).value),
            date_of_death: row.getCell(headerMap["Tanggal Wafat"]).value ? new Date(row.getCell(headerMap["Tanggal Wafat"]).value) : null,
            id_card_number: safeString(row.getCell(headerMap["No. KTP"]).value),
            phone_number: safeString(row.getCell(headerMap["No. HP"]).value),
            email: safeString(row.getCell(headerMap["Email"]).value),
            marital_status: safeString(row.getCell(headerMap["Status Perkawinan"]).value),
            last_education_level: safeString(row.getCell(headerMap["Pendidikan Terakhir"]).value),
            education_major: safeString(row.getCell(headerMap["Jurusan Pendidikan"]).value),
            job_name: safeString(row.getCell(headerMap["Pekerjaan"]).value),
            domicile_location_id: domicileLocation.location_id,
            id_card_location_id: idCardLocation.location_id,
            qiu_dao_id: qiuDao?.qiu_dao_id || null,
        };

        await createUser(user);
    }

    return { message: "Import selesai" };
};

export const importQiudaoFromExcel = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const qiudaoSheet = workbook.getWorksheet("Qiudao");
    if (!qiudaoSheet) throw new Error("Sheet 'Qiudao' tidak ditemukan");

    const headerRow = qiudaoSheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
        headerMap[cell.value] = colNumber;
    });

    for (let i = 2; i <= qiudaoSheet.rowCount; i++) {
        const row = qiudaoSheet.getRow(i);

        const qiu_dao_name = safeString(row.getCell(headerMap["Nama Qiudao"]).value);
        const qiu_dao_mandarin_name = safeString(row.getCell(headerMap["Nama Qiudao (Mandarin)"]).value);
        const dian_chuan_shi_name = safeString(row.getCell(headerMap["Nama Pandita"]).value);
        const dian_chuan_shi_mandarin_name = safeString(row.getCell(headerMap["Nama Pandita (Mandarin)"]).value);
        const yin_shi_qd_name = safeString(row.getCell(headerMap["Nama Guru Pengajak"]).value);
        const yin_shi_qd_mandarin_name = safeString(row.getCell(headerMap["Nama Guru Pengajak (Mandarin)"]).value);
        const bao_shi_qd_name = safeString(row.getCell(headerMap["Nama Guru Penanggung"]).value);
        const bao_shi_qd_mandarin_name = safeString(row.getCell(headerMap["Nama Guru Penanggung (Mandarin)"]).value);
        const lunar_sui_ci_year = safeString(row.getCell(headerMap["Tahun Lunar"]).value);
        const lunar_month = safeString(row.getCell(headerMap["Bulan Lunar"]).value);
        const lunar_day = safeString(row.getCell(headerMap["Tanggal Lunar"]).value);
        const lunar_shi_chen_time = safeString(row.getCell(headerMap["Waktu Lunar"]).value);

        const qdLocation = await getOrCreateLocation({
            location_name: safeString(row.getCell(headerMap["Nama Vihara"]).value),
            location_mandarin_name: safeString(row.getCell(headerMap["Nama Vihara (Mandarin)"]).value),
            street: safeString(row.getCell(headerMap["Alamat Vihara"]).value),
            locality: safeString(row.getCell(headerMap["Kelurahan"]).value),
            district: safeString(row.getCell(headerMap["Kecamatan"]).value),
            city: safeString(row.getCell(headerMap["Kota"]).value),
            province: safeString(row.getCell(headerMap["Provinsi"]).value),
            postal_code: safeString(row.getCell(headerMap["Kode Pos"]).value),
            area: safeString(row.getCell(headerMap["Korda Wilayah"])?.value) || "Korwil_1",
            location_type: "Temple",
        });

        const existing = await prisma.qiuDao.findFirst({
            where: {
                qiu_dao_name,
                qiu_dao_mandarin_name,
                qiu_dao_location_id: qdLocation.location_id,
                dian_chuan_shi_name,
                dian_chuan_shi_mandarin_name,
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
            console.log(`[IMPORT QIUDAO] Duplikat ditemukan: ${qiu_dao_name}, dilewati.`);
            continue;
        }

        await createQiuDao({
            qiu_dao_name,
            qiu_dao_mandarin_name,
            qiu_dao_location_id: qdLocation.location_id,
            dian_chuan_shi_name,
            dian_chuan_shi_mandarin_name,
            yin_shi_qd_name,
            yin_shi_qd_mandarin_name,
            bao_shi_qd_name,
            bao_shi_qd_mandarin_name,
            lunar_sui_ci_year,
            lunar_month,
            lunar_day,
            lunar_shi_chen_time,
        });
    }

    return { message: "Import Qiudao selesai" };
};


