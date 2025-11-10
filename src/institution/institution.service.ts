import * as repo from "./institution.repository";
import { Prisma } from "@prisma/client";

export const getAllInstitutions = async () => {
    return await repo.getAllInstitutions();
};

export const createInstitution = async (data: Prisma.InstitutionCreateInput) => {
    if (!data.institution_name || !data.institution_leader) {
        throw new Error("Nama lembaga dan pimpinan wajib diisi");
    }
    return await repo.createInstitution(data);
};

export const updateInstitution = async (id: number, data: Prisma.InstitutionUpdateInput) => {
    return await repo.updateInstitution(id, data);
};

export const deleteInstitution = async (id: number) => {
    return await repo.deleteInstitution(id);
};