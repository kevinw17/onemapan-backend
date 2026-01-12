import { Role, UserRole, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
    createRole,
    getAllRoles,
    findRoleById,
    updateRole,
    deleteRole,
    createUserRole,
    deleteUserRole,
    getUserRolesByUserId,
    getAllUsers,
} from "./role.repository";
import prisma from "../db";

type Permissions = {
    [key: string]: {
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
        import?: boolean;
        read_national?: boolean;
        read_area?: boolean;
        create_type?: boolean;
        create_role?: boolean;
        edit_role?: boolean;
        delete_role?: boolean;
        scope: string;
    };
};

interface CreateRoleInput {
    name: string;
    description?: string;
    permissions: Permissions;
}

interface UpdateRoleInput {
    name?: string;
    description?: string;
    permissions?: Permissions;
}

const validModules = ["umat", "qiudao", "dashboard", "kegiatan", "account"];
const validScopes = ["nasional", "wilayah", "fotang", "self"];
const validActions: { [key: string]: string[] } = {
    umat: ["create", "read", "update", "delete", "import"],
    qiudao: ["create", "read", "update", "delete", "import"],
    dashboard: ["read_national", "read_area"],
    kegiatan: ["create", "read", "update", "delete", "create_type"],
    account: ["create_role", "edit_role", "delete_role"],
};

const validatePermissions = (permissions: Permissions) => {
    if (typeof permissions !== "object" || permissions === null) {
        throw new Error("Permissions harus berupa objek JSON");
    }
    for (const module of Object.keys(permissions)) {
        if (!validModules.includes(module)) {
            throw new Error(`Modul tidak valid: ${module}`);
        }
        const mod = permissions[module];
        if (!mod || typeof mod !== "object" || !mod.scope) {
            throw new Error(`Modul ${module} harus memiliki properti scope`);
        }
        if (!validScopes.includes(mod.scope)) {
            throw new Error(`Scope tidak valid untuk ${module}: ${mod.scope}`);
        }
        for (const action of Object.keys(mod)) {
            if (action !== "scope" && !validActions[module].includes(action)) {
                throw new Error(`Aksi tidak valid untuk ${module}: ${action}`);
            }
        }
    }
};

const validateAreaAccess = (userRole: string, userArea: string | null, permissions: Permissions) => {
    if (userRole !== "Super_Admin" && userArea) {
        for (const module of Object.keys(permissions)) {
            const mod = permissions[module];
            if (mod && mod.scope !== "nasional" && mod.scope !== userArea) {
                throw new Error(`Admin hanya dapat mengelola peran untuk wilayah ${userArea} atau nasional`);
            }
        }
    }
};

export const createNewRole = async (
    data: CreateRoleInput,
    userRole: string,
    userArea: string | null
): Promise<Role> => {
    if (!data.name) {
        throw new Error("Nama peran wajib diisi");
    }

    validatePermissions(data.permissions);
    validateAreaAccess(userRole, userArea, data.permissions);

    return await createRole({
        name: data.name,
        description: data.description,
        permissions: data.permissions as Prisma.InputJsonValue,
    });
};

export const fetchAllRoles = async (
    userRole: string,
    userArea: string | null
): Promise<Role[]> => {
    const roles = await getAllRoles();
    
    if (userRole === "Super Admin" || userRole === "Ketua Lembaga" || userRole === "Sekjen Lembaga") {
        return roles;
    }
    
    return roles.filter(role => {
        const permissions = role.permissions as Permissions;
        return Object.keys(permissions).every(module => {
            const mod = permissions[module];
            return mod && (mod.scope === "nasional" || mod.scope === userArea);
        });
    });
};

export const getRoleById = async (id: number): Promise<Role | null> => {
    if (!id || typeof id !== "number") {
        throw new Error("ID peran tidak valid");
    }
    return await findRoleById(id);
};

export const updateRoleById = async (
    id: number,
    updateData: UpdateRoleInput,
    userRole: string,
    userArea: string | null
): Promise<Role> => {
    if (!id || typeof id !== "number") {
        throw new Error("ID peran tidak valid");
    }

    const role = await findRoleById(id);
    if (!role) {
        throw new Error("Peran tidak ditemukan");
    }

    if (updateData.permissions) {
        validatePermissions(updateData.permissions);
    }
    validateAreaAccess(userRole, userArea, updateData.permissions || (role.permissions as Permissions));

    return await updateRole(id, {
        ...updateData,
        permissions: updateData.permissions as Prisma.InputJsonValue,
    });
};

export const deleteRoleById = async (
    id: number,
    userRole: string,
    userArea: string | null
): Promise<Role> => {
    if (!id || typeof id !== "number") {
        throw new Error("ID peran tidak valid");
    }

    const role = await findRoleById(id);
    if (!role) {
        throw new Error("Peran tidak ditemukan");
    }

    validateAreaAccess(userRole, userArea, role.permissions as Permissions);

    return await deleteRole(id);
};

export const assignRoleToUser = async (
    user_id: string,
    role_id: number,
    userRole: string,
    userArea: string | null
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

    validateAreaAccess(userRole, userArea, role.permissions as Permissions);

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
    user_id: string,
    role_id: number,
    userRole: string,
    userArea: string | null
): Promise<UserRole> => {
    if (!user_id || !role_id) {
        throw new Error("user_id dan role_id wajib diisi");
    }

    const role = await findRoleById(role_id);
    if (!role) {
        throw new Error("Peran tidak ditemukan");
    }

    validateAreaAccess(userRole, userArea, role.permissions as Permissions);

    return await deleteUserRole(user_id, role_id);
};

export const getRolesByUserId = async (user_id: string): Promise<(UserRole & { role: Role })[]> => {
    if (!user_id || typeof user_id !== "string") {
        throw new Error("ID user tidak valid");
    }

    return await getUserRolesByUserId(user_id);
};

export const fetchAllUsers = async (
    userRole: string,
    userArea: string | null
): Promise<User[]> => {
    const users = await getAllUsers();
    if (userRole === "Super_Admin") {
        return users;
    }
    return users;
};