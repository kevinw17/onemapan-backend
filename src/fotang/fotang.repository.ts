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

export const createFotangFromImport = async (data: FotangImportInput) => {
    if (!data.location_name || !data.localityId) {
        throw new Error("Data fotang tidak lengkap");
    }

    const existingFotang = await prisma.fotang.findFirst({
        where: {
            location_name: data.location_name,
            localityId: data.localityId,
            street: data.street ?? undefined,
        },
    });

    if (existingFotang) {
        return existingFotang;
    }

    return await prisma.fotang.create({
        data: {
            location_name: data.location_name,
            location_mandarin_name: data.location_mandarin_name,
            street: data.street,
            postal_code: data.postal_code,
            latitude: data.latitude,
            longitude: data.longitude,
            area: data.area,
            locality: {
                connect: { id: data.localityId },
            },
        },
    });
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
    if (!data.location_name || !data.locality?.connect?.id) {
        throw new Error("Data fotang tidak lengkap");
    }

    return await prisma.fotang.create({ data });
};


export const updateFotang = async (id: number, data: Prisma.FotangUpdateInput) => {
    return prisma.fotang.update({ where: { fotang_id: id }, data });
};

export const deleteFotang = async (id: number) => {
    return prisma.fotang.delete({ where: { fotang_id: id } });
};
