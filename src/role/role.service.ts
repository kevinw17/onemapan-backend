import { Role, UserRole } from "@prisma/client";
import {
    createRole,
    getAllRoles,
    findRoleById,
    updateRole,
    deleteRole,
    createUserRole,
    deleteUserRole,
    getUserRolesByUserId,
} from "./role.repository";
import prisma from "../db";

interface CreateRoleInput {
    name: string;
    description?: string;
    permissions: any;
}

interface UpdateRoleInput {
    name?: string;
    description?: string;
    permissions?: any;
}

export const createNewRole = async (data: CreateRoleInput): Promise<Role> => {
    if (!data.name) {
        throw new Error("Nama peran wajib diisi");
    }

    if (!data.permissions || typeof data.permissions !== "object") {
        throw new Error("Permissions harus berupa objek JSON");
    }

    return await createRole({
        name: data.name,
        description: data.description,
        permissions: data.permissions,
    });
};

export const fetchAllRoles = async (): Promise<Role[]> => {
    return await getAllRoles();
};

export const getRoleById = async (id: number): Promise<Role | null> => {
    if (!id || typeof id !== "number") {
        throw new Error("ID peran tidak valid");
    }
    return await findRoleById(id);
};

export const updateRoleById = async (
    id: number,
    updateData: UpdateRoleInput
): Promise<Role> => {
    if (!id || typeof id !== "number") {
        throw new Error("ID peran tidak valid");
    }

    return await updateRole(id, updateData);
};

export const deleteRoleById = async (id: number): Promise<Role> => {
    if (!id || typeof id !== "number") {
        throw new Error("ID peran tidak valid");
    }

    const role = await findRoleById(id);
    if (!role) {
        throw new Error("Peran tidak ditemukan");
    }

    return await deleteRole(id);
};

export const assignRoleToUser = async (
    user_id: number,
    role_id: number
): Promise<UserRole> => {
    if (!user_id || !role_id) {
        throw new Error("user_id dan role_id wajib diisi");
    }

    const user = await prisma.user.findUnique({ where: { user_info_id: user_id } });
    const role = await findRoleById(role_id);
    if (!user) {
        throw new Error("User tidak ditemukan");
    }
    if (!role) {
        throw new Error("Peran tidak ditemukan");
    }

    const existingUserRole = await prisma.userRole.findUnique({
        where: { user_id_role_id: { user_id, role_id } },
    });
    if (existingUserRole) {
        throw new Error("User sudah memiliki peran ini");
    }

    return await createUserRole({
        user: { connect: { user_info_id: user_id } },
        role: { connect: { role_id } },
    });
};

export const removeRoleFromUser = async (
    user_id: number,
    role_id: number
): Promise<UserRole> => {
    if (!user_id || !role_id) {
        throw new Error("user_id dan role_id wajib diisi");
    }

    return await deleteUserRole(user_id, role_id);
};

export const getRolesByUserId = async (user_id: number): Promise<(UserRole & { role: Role })[]> => {
    if (!user_id || typeof user_id !== "number") {
        throw new Error("ID user tidak valid");
    }

    return await getUserRolesByUserId(user_id);
};