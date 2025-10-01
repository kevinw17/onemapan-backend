import prisma from "../db";
import { Prisma, Role, UserRole } from "@prisma/client";

export const createRole = async (data: Prisma.RoleCreateInput): Promise<Role> => {
    return await prisma.role.create({ data });
};

export const getAllRoles = async (): Promise<Role[]> => {
    return await prisma.role.findMany({
        include: {
            userRoles: {
                include: {
                user: true,
                },
            },
        },
    });
};

export const findRoleById = async (id: number): Promise<Role | null> => {
    return await prisma.role.findUnique({
        where: { role_id: id },
        include: {
            userRoles: {
                include: {
                user: true,
                },
            },
        },
    });
};

export const updateRole = async (
    id: number,
    updateData: Prisma.RoleUpdateInput
): Promise<Role> => {
    return await prisma.role.update({
        where: { role_id: id },
        data: updateData,
    });
};

export const deleteRole = async (id: number): Promise<Role> => {
    return await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({
            where: { role_id: id },
        });
        return await tx.role.delete({
            where: { role_id: id },
        });
    });
};

export const createUserRole = async (
    data: Prisma.UserRoleCreateInput
): Promise<UserRole> => {
    return await prisma.userRole.create({ data });
};

export const deleteUserRole = async (
    user_id: number,
    role_id: number
): Promise<UserRole> => {
    return await prisma.userRole.delete({
        where: {
            user_id_role_id: { user_id, role_id },
        },
    });
};

export const getUserRolesByUserId = async (user_id: number): Promise<(UserRole & { role: Role })[]> => {
    return await prisma.userRole.findMany({
        where: { user_id },
        include: {
            role: true,
        },
    });
};