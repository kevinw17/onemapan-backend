import * as fotangRepo from "../fotang/fotang.repository";
import { Prisma } from "@prisma/client";

export const getAllFotang = async () => {
    return await fotangRepo.getAllFotang();
};

export const findFotangById = async (id: number) => {
    return await fotangRepo.findFotangById(id);
};

export const createFotang = async (data: Prisma.FotangCreateInput) => {
    return await fotangRepo.createFotang(data);
};

export const updateFotang = async (id: number, data: Prisma.FotangUpdateInput) => {
    return await fotangRepo.updateFotang(id, data);
};

export const deleteFotang = async (id: number) => {
    return await fotangRepo.deleteFotang(id);
};
