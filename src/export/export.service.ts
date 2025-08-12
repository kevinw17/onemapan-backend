import ExcelJS from "exceljs";
import { getAllQiuDao, QiuDaoWithRelations } from "../profile/qiudao/qiudao.repository";
import { getAllUsers } from "../profile/user/user.repository";
import { Location, User } from "@prisma/client";

function formatLocation(location?: any): string {
  if (!location) return "";
  const province = location.locality?.district?.city?.province?.name;
  const city = location.locality?.district?.city?.name;
  const district = location.locality?.district?.name;
  const locality = location.locality?.name;
  const street = location.street;
  const postal_code = location.postal_code;

  const parts = [street, locality, district, city, province, postal_code].filter(Boolean);
  return parts.join(", ");
}

function formatDateOnly(date?: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export const generateQiudaoExcel = async (): Promise<Buffer> => {
  const data = await getAllQiuDao();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Qiudao");

  worksheet.columns = [
    { header: "ID", key: "qiu_dao_id", width: 10 },
    { header: "Nama Qiudao (Indonesia)", key: "qiu_dao_name", width: 20 },
    { header: "Nama Qiudao (Mandarin)", key: "qiu_dao_mandarin_name", width: 20 },
    { header: "Nama Indonesia Pandita", key: "dian_chuan_shi_name", width: 20 },
    { header: "Nama Mandarin Pandita", key: "dian_chuan_shi_mandarin_name", width: 20 },
    { header: "Nama Indonesia Guru Pengajak", key: "yin_shi_qd_name", width: 20 },
    { header: "Nama Mandarin Guru Pengajak", key: "yin_shi_qd_mandarin_name", width: 20 },
    { header: "Nama Indonesia Guru Penanggung", key: "bao_shi_qd_name", width: 20 },
    { header: "Nama Mandarin Guru Penanggung", key: "bao_shi_qd_mandarin_name", width: 20 },
    { header: "Tanggal Lunar", key: "tanggal_lunar", width: 20 },
    { header: "Lokasi Qiudao (Indonesia)", key: "location_name", width: 20 },
    { header: "Lokasi Qiudao (Mandarin)", key: "location_mandarin_name", width: 20 },
    { header: "Wilayah", key: "area", width: 20 },
    { header: "Provinsi", key: "province", width: 20 },
    { header: "Kabupaten / Kota", key: "city", width: 30 },
    { header: "Kecamatan", key: "district", width: 30 },
    { header: "Kelurahan / Desa", key: "locality", width: 30 },
    { header: "Alamat", key: "street", width: 35 },
    { header: "Kode Pos", key: "postal_code", width: 20 },
  ];

  data.forEach((item: QiuDaoWithRelations) => {
    worksheet.addRow({
      qiu_dao_id: item.qiu_dao_id,
      qiu_dao_name: item.qiu_dao_name,
      qiu_dao_mandarin_name: item.qiu_dao_mandarin_name,
      dian_chuan_shi_name: item.dian_chuan_shi?.name || "-",
      dian_chuan_shi_mandarin_name: item.dian_chuan_shi?.mandarin_name || "-",
      yin_shi_qd_name: item?.yin_shi_qd_name || "-",
      yin_shi_qd_mandarin_name: item?.yin_shi_qd_mandarin_name || "-",
      bao_shi_qd_name: item?.bao_shi_qd_name || "-",
      bao_shi_qd_mandarin_name: item?.bao_shi_qd_mandarin_name || "-",
      tanggal_lunar:
        (item.lunar_sui_ci_year || "") +
        (item.lunar_month || "") +
        (item.lunar_day || "") +
        (item.lunar_shi_chen_time || ""),
      location_name: item.qiu_dao_location?.location_name || "-",
      location_mandarin_name: item.qiu_dao_location?.location_mandarin_name || "-",
      area:
        item.qiu_dao_location?.area === "Korwil_1"
          ? "Wilayah 1"
          : item.qiu_dao_location?.area === "Korwil_2"
          ? "Wilayah 2"
          : item.qiu_dao_location?.area === "Korwil_3"
          ? "Wilayah 3"
          : item.qiu_dao_location?.area === "Korwil_4"
          ? "Wilayah 4"
          : item.qiu_dao_location?.area === "Korwil_5"
          ? "Wilayah 5"
          : item.qiu_dao_location?.area === "Korwil_6"
          ? "Wilayah 6"
          : "-",
      province: item.qiu_dao_location?.locality?.district?.city?.province?.name || "-",
      city: item.qiu_dao_location?.locality?.district?.city?.name || "-",
      district: item.qiu_dao_location?.locality?.district?.name || "-",
      locality: item.qiu_dao_location?.locality?.name || "-",
      street: item.qiu_dao_location?.street || "-",
      postal_code: item.qiu_dao_location?.postal_code|| "-",
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
};

export const generateUserExcel = async (): Promise<Buffer> => {
  const users = await getAllUsers();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Umat");

  worksheet.columns = [
    { header: "ID", key: "user_info_id", width: 10 },
    { header: "Nama lengkap", key: "full_name", width: 25 },
    { header: "Nama mandarin", key: "mandarin_name", width: 15 },
    { header: "Status ikrar vegetarian", key: "is_qing_kou", width: 10 },
    { header: "Status Rohani", key: "spiritual_status", width: 15 },
    { header: "Jenis kelamin", key: "gender", width: 10 },
    { header: "Golongan darah", key: "blood_type", width: 10 },
    { header: "Tempat Lahir", key: "place_of_birth", width: 20 },
    { header: "Tanggal Lahir", key: "date_of_birth", width: 15 }, 
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

  users.forEach((user: User & {
    domicile_location?: Location | null;
    id_card_location?: Location | null;
    spiritualUser?: {
      spiritual_status?: string | null;
    } | null;
  }) => {
    worksheet.addRow({
      user_info_id: user.user_info_id,
      full_name: user.full_name,
      mandarin_name: user.mandarin_name,
      is_qing_kou: user.is_qing_kou ? "Sudah berikrar vegetarian" : "Belum berikrar vegetarian",
      spiritual_status: user.spiritualUser?.spiritual_status || "-",
      gender: user.gender === "Female" ? "Wanita" : user.gender === "Male" ? "Pria" : "-",
      blood_type: user.blood_type || "-",
      place_of_birth: user.place_of_birth || "-",
      date_of_birth: formatDateOnly(user.date_of_birth),
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

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
};
