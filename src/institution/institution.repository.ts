import prisma from "../db";
import { Prisma } from "@prisma/client";

export const getAllInstitutions = async () => {
    return prisma.institution.findMany({
        orderBy: { institution_id: "asc" },
    });
};

export const createInstitution = async (data: Prisma.InstitutionCreateInput) => {
    return prisma.institution.create({ data });
};

export const updateInstitution = async (id: number, data: Prisma.InstitutionUpdateInput) => {
    return prisma.institution.update({
        where: { institution_id: id },
        data,
    });
};

export const deleteInstitution = async (id: number) => {
    return prisma.institution.delete({
        where: { institution_id: id },
    });
};