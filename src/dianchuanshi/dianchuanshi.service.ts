import {
    findAllDianChuanShi,
    findDianChuanShiById,
    createDianChuanShi,
    updateDianChuanShi,
    deleteDianChuanShi,
} from "./dianchuanshi.repository";
import { Prisma } from "@prisma/client";

export const getAllDianChuanShiService = async () => {
    return await findAllDianChuanShi();
};

export const getDianChuanShiByIdService = async (id: number) => {
    const data = await findDianChuanShiById(id);
    if (!data) throw new Error("Pandita tidak ditemukan");
    return data;
};

export const createDianChuanShiService = async (data: Prisma.DianChuanShiCreateInput) => {
    if (!data.name || !data.area) {
        throw new Error("Nama dan area wajib diisi");
    }
    return await createDianChuanShi(data);
};

export const updateDianChuanShiService = async (id: number, data: Prisma.DianChuanShiUpdateInput) => {
    if (Object.keys(data).length === 0) {
        throw new Error("Tidak ada data yang dikirim untuk update");
    }
    const existing = await findDianChuanShiById(id);
    if (!existing) throw new Error("Pandita tidak ditemukan");
    return await updateDianChuanShi(id, data);
};

export const deleteDianChuanShiService = async (id: number) => {
    const existing = await findDianChuanShiById(id);
    if (!existing) throw new Error("Pandita tidak ditemukan");
    await deleteDianChuanShi(id);
    return { message: "Pandita berhasil dihapus" };
};