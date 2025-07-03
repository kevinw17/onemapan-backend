import ExcelJS from "exceljs";
import { getAllQiuDao } from "../profile/qiudao/qiudao.repository.js";
import { getAllUsers } from "../profile/user/user.repository.js";

function formatLocation(location) {
    if (!location) return "";
    const parts = [
        location.street,
        location.locality,
        location.district,
        location.city,
        location.province,
        location.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
}

function formatDateOnly(date) {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
}

export const generateQiudaoExcel = async () => {
    const data = await getAllQiuDao();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Qiudao");

    worksheet.columns = [
        { header: "ID", key: "qiu_dao_id", width: 10 },
        { header: "Nama Qiudao (Indonesia)", key: "qiu_dao_name", width: 20 },
        { header: "Nama Qiudao (Mandarin)", key: "qiu_dao_mandarin_name", width: 20 },
        { header: "Dian Chuan Shi", key: "dian_chuan_shi_mandarin_name", width: 20 },
        { header: "Guru Pengajak", key: "yin_shi_qd_mandarin_name", width: 20 },
        { header: "Guru Penanggung", key: "bao_shi_qd_mandarin_name", width: 20 },
        { header: "Tanggal Lunar", key: "tanggal_lunar", width: 20 },
        { header: "Nama Vihara (Indonesia)", key: "location_name", width: 20 },
        { header: "Nama Vihara (Mandarin)", key: "location_mandarin_name", width: 20 },
        { header: "Provinsi", key: "province", width: 20 },
        { header: "Kota", key: "city", width: 20 },
        { header: "Korwil", key: "area", width: 20 },
    ];

    data.forEach((item) => {
        worksheet.addRow({
        qiu_dao_id: item.qiu_dao_id,
        qiu_dao_name: item.qiu_dao_name,
        qiu_dao_mandarin_name: item.qiu_dao_mandarin_name,
        dian_chuan_shi_mandarin_name: item.dian_chuan_shi_mandarin_name,
        yin_shi_qd_mandarin_name: item.yin_shi_qd_mandarin_name,
        bao_shi_qd_mandarin_name: item.bao_shi_qd_mandarin_name,
        tanggal_lunar:
            (item.lunar_sui_ci_year || "") +
            (item.lunar_month || "") +
            (item.lunar_day || "") +
            (item.lunar_shi_chen_time || ""),
        location_name: item.qiu_dao_location?.location_name || "-",
        location_mandarin_name: item.qiu_dao_location?.location_mandarin_name || "-",
        province: item.qiu_dao_location?.province || "-",
        city: item.qiu_dao_location?.city || "-",
        area: item.qiu_dao_location?.area === "Korwil_1"
            ? "Korda Wilayah 1"
            : item.qiu_dao_location?.area === "Korwil_2"
            ? "Korda Wilayah 2"
            : item.qiu_dao_location?.area === "Korwil_3"
            ? "Korda Wilayah 3"
            : item.qiu_dao_location?.area === "Korwil_4"
            ? "Korda Wilayah 4"
            : item.qiu_dao_location?.area === "Korwil_5"
            ? "Korda Wilayah 5"
            : item.qiu_dao_location?.area === "Korwil_6"
            ? "Korda Wilayah 6"
            : "-",
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

export const generateUserExcel = async () => {
    const users = await getAllUsers();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Umat");

    worksheet.columns = [
        { header: "ID", key: "user_info_id", width: 10 },
        { header: "Nama lengkap", key: "full_name", width: 25 },
        { header: "Nama mandarin", key: "mandarin_name", width: 15 },
        { header: "Status ikrar vegetarian", key: "is_qing_kou", width: 10 },
        { header: "Jenis kelamin", key: "gender", width: 10 },
        { header: "Golongan darah", key: "blood_type", width: 10 },
        { header: "Tempat, Tanggal Lahir", key: "birth", width: 25 },
        { header: "No. KTP", key: "id_card_number", width: 20 },
        { header: "No. HP", key: "phone_number", width: 15 },
        { header: "Email", key: "email", width: 20 },
        { header: "Status Perkawinan", key: "marital_status", width: 20 },
        { header: "Pendidikan Terakhir", key: "last_education_level", width: 20 },
        { header: "Jurusan", key: "education_major", width: 20 },
        { header: "Pekerjaan", key: "job_name", width: 20 },
        { header: "Alamat Domisili", key: "domicile", width: 50 },
        { header: "Alamat KTP", key: "ktp", width: 50 },
    ];

    users.forEach((user) => {
        worksheet.addRow({
        user_info_id: user.user_info_id,
        full_name: user.full_name,
        mandarin_name: user.mandarin_name,
        is_qing_kou: user.is_qing_kou ? "Sudah berikrar vegetarian" : "Belum berikrar vegetarian",
        gender: 
            user.gender === "Female"
            ? "Wanita"
            : user.gender === "Male"
            ? "Pria"
            : "-",
        blood_type: user.blood_type || "-",
        birth: `${user.place_of_birth}, ${formatDateOnly(user.date_of_birth)}`,
        id_card_number: user.id_card_number || "-",
        phone_number: user.phone_number,
        email: user.email || "-",
        marital_status:
            user.marital_status === "Married"
                ? "Sudah menikah"
                : user.marital_status === "Not_Married"
                ? "Belum menikah"
                : "-",
        last_education_level: user.last_education_level || "-",
        education_major: user.education_major || "-",
        job_name: user.job_name || "-",
        domicile: formatLocation(user.domicile_location),
        ktp: formatLocation(user.id_card_location),
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};
