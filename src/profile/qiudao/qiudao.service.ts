import {
  createQiuDao,
  findQiuDaoById,
  updateQiuDao,
  removeQiuDao,
  getQiudaosPaginated,
  QiuDaoWithRelations,
} from "./qiudao.repository";
import { Prisma, QiuDao, Korwil } from "@prisma/client";

interface QiudaoInput extends Omit<Prisma.QiuDaoCreateInput, "qiu_dao_card_s3_url" | "qiu_dao_location"> {
  qiu_dao_location_id: number;
  dian_chuan_shi_id?: number;
}

export const registerQiuDao = async (
  data: QiudaoInput
): Promise<QiuDao> => {
  const {
    qiu_dao_name,
    qiu_dao_mandarin_name,
    qiu_dao_location_id,
    lunar_sui_ci_year,
    lunar_month,
    lunar_day,
    lunar_shi_chen_time,
    dian_chuan_shi_id,
    yin_shi_qd_name,
    yin_shi_qd_mandarin_name,
    bao_shi_qd_name,
    bao_shi_qd_mandarin_name,
  } = data;

  if (!qiu_dao_location_id) {
    throw new Error("Lokasi qiudao wajib diisi");
  }

  const validateName = (
    name: string | null | undefined,
    mandarin: string | null | undefined,
    label: string
  ) => {
    if (!name?.trim() && !mandarin?.trim()) {
      throw new Error(`${label} (Indonesia atau Mandarin) wajib diisi.`);
    }
  };

  validateName(qiu_dao_name, qiu_dao_mandarin_name, "Nama QiuDao");
  validateName(yin_shi_qd_name, yin_shi_qd_mandarin_name, "Nama Guru Pengajak");
  validateName(bao_shi_qd_name, bao_shi_qd_mandarin_name, "Nama Guru Penanggung");

  return await createQiuDao({
    qiu_dao_name,
    qiu_dao_mandarin_name,
    qiu_dao_location: {
      connect: { fotang_id: qiu_dao_location_id }
    },
    lunar_sui_ci_year,
    lunar_month,
    lunar_day,
    lunar_shi_chen_time,
    dian_chuan_shi: dian_chuan_shi_id
      ? { connect: { id: dian_chuan_shi_id } }
      : undefined,
    yin_shi_qd_name,
    yin_shi_qd_mandarin_name,
    bao_shi_qd_name,
    bao_shi_qd_mandarin_name,
    qiu_dao_card_s3_url: null,
  });
};

interface FetchAllQiudaoOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  area?: Korwil; 
  userId?: number;
}

export const fetchAllQiudao = async ({
  page = 1,
  limit = 10,
  search = "",
  searchField = "qiu_dao_mandarin_name",
  area,
  userId,
}: FetchAllQiudaoOptions) => {
  const skip = (page - 1) * limit;
  return await getQiudaosPaginated({ skip, limit, search, searchField, area, userId });
};

export const getQiuDaoById = async (
  id: number
): Promise<QiuDaoWithRelations | null> => {
  return await findQiuDaoById(id);
};

export const updateQiuDaoById = async (
  id: number,
  updatedData: Prisma.QiuDaoUpdateInput
): Promise<QiuDao> => {
  if (!id || typeof id !== "number") {
    throw new Error("ID QiuDao tidak valid");
  }

  return await updateQiuDao(id, updatedData);
};

export const deleteQiuDaoById = async (
  id: number
): Promise<QiuDao> => {
  if (!id || typeof id !== "number") {
    throw new Error("ID tidak valid");
  }
  return await removeQiuDao(id);
};