import prisma from "../db";
import { Prisma } from "@prisma/client";

export const findAllDianChuanShi = async () => {
    return await prisma.dianChuanShi.findMany({
        select: {
        id: true,
        name: true,
        mandarin_name: true,
        area: true,
        is_fuwuyuan: true,
        ling_ming_time: true,
        },
        orderBy: { id: "asc" },
    });
};

export const findDianChuanShiById = async (id: number) => {
    return await prisma.dianChuanShi.findUnique({
        where: { id },
        select: {
        id: true,
        name: true,
        mandarin_name: true,
        area: true,
        is_fuwuyuan: true,
        ling_ming_time: true,
        },
    });
};

export const createDianChuanShi = async (data: Prisma.DianChuanShiCreateInput) => {
    return await prisma.dianChuanShi.create({ data });
};

export const updateDianChuanShi = async (id: number, data: Prisma.DianChuanShiUpdateInput) => {
    return await prisma.dianChuanShi.update({
        where: { id },
        data,
    });
};

export const deleteDianChuanShi = async (id: number) => {
    return await prisma.dianChuanShi.delete({
        where: { id },
    });
};