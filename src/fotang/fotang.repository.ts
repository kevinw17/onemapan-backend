import prisma from "../db";
import { Korwil, Prisma } from "@prisma/client";

type FotangImportInput = {
    location_name: string;
    location_mandarin_name?: string;
    street?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    area: Korwil;
    localityId: number;
};

export const getAllFotang = async () => {
    return prisma.fotang.findMany({
        include: {
        locality: {
            include: {
            district: {
                include: {
                city: {
                    include: {
                    province: true,
                    },
                },
                },
            },
            },
        },
        },
        orderBy: { location_name: "asc" },
    });
};

export const findFotangById = async (id: number) => {
    return prisma.fotang.findUnique({
        where: { fotang_id: id },
        include: {
        locality: {
            include: {
            district: {
                include: {
                city: {
                    include: {
                    province: true,
                    },
                },
                },
            },
            },
        },
        },
    });
};

export const createFotang = async (data: Prisma.FotangCreateInput) => {
    return await prisma.fotang.create({ data });
};


export const updateFotang = async (id: number, data: Prisma.FotangUpdateInput) => {
    return prisma.fotang.update({ where: { fotang_id: id }, data });
};

export const deleteFotang = async (id: number) => {
    return prisma.fotang.delete({ where: { fotang_id: id } });
};
