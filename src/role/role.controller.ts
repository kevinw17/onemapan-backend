import express, { Request, Response, NextFunction, RequestHandler } from "express";
import {
    createNewRole,
    fetchAllRoles,
    getRoleById,
    updateRoleById,
    deleteRoleById,
    assignRoleToUser,
    removeRoleFromUser,
    getRolesByUserId,
} from "./role.service";
import { jwtDecode } from "jwt-decode";
import prisma from "../db";
import { Korwil } from "@prisma/client";

interface ExtendedJwtPayload {
    credential_id: number;
    username: string;
    user_info_id: number;
    role: string;
    area: string | null;
    scope: string;
}

interface AuthRequest extends Request {
    user?: ExtendedJwtPayload;
}

const router = express.Router();

const authMiddleware: RequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.status(401).json({ message: "No token provided" });
        return;
    }
    try {
        const decoded = jwtDecode<ExtendedJwtPayload>(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
        return;
    }
};

router.use(authMiddleware);

router.get("/users", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }

            let whereClause: any = {};

            const roleLower = (req.user.role || "").toLowerCase().trim().replace(/\s+/g, "");
            if (!roleLower.includes("superadmin") && req.user.area) {
                whereClause.qiudao = {
                    qiu_dao_location: {
                    area: req.user.area as Korwil
                    }
                };
            }

            const users = await prisma.user.findMany({
                where: whereClause,
                include: {
                    userCredential: {
                        select: {
                            username: true,
                            last_logged_in: true
                        }
                    }
                },
                orderBy: {
                    full_name: 'asc'
                }
            });

            console.log("Jumlah user yang dikembalikan:", users.length);

            const usersWithCredentials = users
                .filter(user => 
                    user.userCredential !== null && 
                    user.userCredential.username?.trim() !== ""
                )
                .map(user => ({
                    user_info_id: user.user_info_id,
                    full_name: user.full_name,
                    username: user.userCredential!.username,
                    last_logged_in: user.userCredential!.last_logged_in
                }));

            res.status(200).json(usersWithCredentials);
            
        } catch (error: any) {
            console.error("Error GET /users:", error);
            res.status(200).json([]);
        }
    })();
});

router.get("/user/:user_id", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            const userId = req.params.user_id;
            const userRoles = await getRolesByUserId(userId);
            res.status(200).json(userRoles);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

router.get("/:id", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }
            const roleId = parseInt(req.params.id);
            
            if (isNaN(roleId)) {
                res.status(400).json({ message: "ID peran tidak valid" });
                return;
            }
            
            const role = await getRoleById(roleId);
            if (!role) {
                res.status(404).json({ message: "Peran tidak ditemukan" });
                return;
            }
            if (req.user.role !== "Super_Admin") {
                const permissions = role.permissions as any;
                const hasAccess = Object.keys(permissions).every(
                    (module: string) => permissions[module].scope === "nasional" || permissions[module].scope === req.user!.area
                );
                if (!hasAccess) {
                    res.status(403).json({ message: "Akses ditolak: Wilayah tidak sesuai" });
                    return;
                }
            }
            res.status(200).json(role);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

router.get("/", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }
            
            const roles = await fetchAllRoles(req.user.role, req.user.area);
            
            const rolesWithUsers = await Promise.all(
                roles.map(async (role) => {
                    const userRoles = await prisma.userRole.findMany({
                        where: { role_id: role.role_id },
                        include: {
                            user: {
                                select: {
                                    user_info_id: true,
                                    full_name: true,
                                    userCredential: {
                                        select: {
                                            username: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                    return {
                        ...role,
                        userRoles: userRoles.map((ur: { user: any; }) => ({
                            ...ur,
                            user: ur.user
                        }))
                    };
                })
            );
            
            res.status(200).json(rolesWithUsers);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

router.post("/", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }
            const { name, description, permissions } = req.body;

console.log("Mencoba buat role baru oleh:", req.user?.role, "dengan scope:", req.body.permissions);

            const role = await createNewRole(
                { name, description, permissions },
                req.user.role,
                req.user.area
            );
            res.status(201).json({ id: role.role_id, message: "Peran berhasil dibuat" });
        } catch (error: any) {
            console.error("Gagal buat role:", error.message);
            res.status(400).json({ message: error.message });
        }
    })();
});

router.put("/:id", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }
            const roleId = parseInt(req.params.id);
            const { name, description, permissions } = req.body;
            const updatedRole = await updateRoleById(
                roleId,
                { name, description, permissions },
                req.user.role,
                req.user.area
            );
            res.status(200).json({
                message: "Peran berhasil diperbarui",
                data: updatedRole,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

router.delete("/:id", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }
            const roleId = parseInt(req.params.id);
            const deletedRole = await deleteRoleById(roleId, req.user.role, req.user.area);
            res.status(200).json({
                message: "Peran berhasil dihapus",
                data: deletedRole,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

router.post("/assign", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }

            const user_id = req.body.user_id;
            const role_id = req.body.role_id;

            if (!user_id || !role_id) {
                res.status(400).json({ message: "user_id dan role_id wajib diisi" });
                return;
            }

            const userId = String(user_id);
            const roleId = parseInt(String(role_id));

            if (isNaN(roleId)) {
                res.status(400).json({ message: "ID harus berupa angka" });
                return;
            }

            const deletedCount = await prisma.userRole.deleteMany({
                where: { user_id: userId }
            });

            const newUserRole = await prisma.userRole.create({
                data: {
                    user_id: userId,
                    role_id: roleId
                },
                include: {
                    role: {
                        select: { 
                            role_id: true, 
                            name: true 
                        }
                    }
                }
            });

            res.status(201).json({
                message: "Peran berhasil ditetapkan ke user",
                data: {
                    user_id: userId,
                    role_id: roleId,
                    role_name: newUserRole.role.name,
                    old_roles_removed: deletedCount.count
                }
            });

        } catch (error: any) {
            if (error.code === 'P2002') {
                res.status(200).json({ 
                    message: "Peran sudah ditetapkan ke user" 
                });
                return;
            }

            res.status(400).json({ 
                message: error.message || "Gagal menetapkan peran" 
            });
        }
    })();
});

router.delete("/remove", (req: AuthRequest, res: Response) => {
    void (async () => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "User not authenticated" });
                return;
            }

            const user_id = req.body.user_id;
            const role_id = req.body.role_id;
            
            if (!user_id || !role_id) {
                res.status(400).json({ message: "user_id dan role_id wajib diisi" });
                return;
            }

            const parsedUserId = String(user_id);
            const parsedRoleId = parseInt(String(role_id));

            if (isNaN(parsedRoleId)) {
                res.status(400).json({ message: "ID harus berupa angka" });
                return;
            }

            const existingUserRole = await prisma.userRole.findUnique({
                where: {
                    user_id_role_id: {
                        user_id: parsedUserId,
                        role_id: parsedRoleId
                    }
                }
            });

            if (!existingUserRole) {
                res.status(200).json({ 
                    message: "Peran sudah tidak terhubung",
                    data: { 
                        user_id: parsedUserId, 
                        role_id: parsedRoleId 
                    }
                });
                return;
            }

            const deleted = await prisma.userRole.delete({
                where: {
                    user_id_role_id: {
                        user_id: parsedUserId,
                        role_id: parsedRoleId
                    }
                }
            });

            res.status(200).json({
                message: "Peran berhasil dihapus dari user",
                data: { 
                    user_id: parsedUserId, 
                    role_id: parsedRoleId 
                }
            });

        } catch (error: any) {
            
            if (error.code === 'P2025') {
                res.status(200).json({ 
                    message: "Peran sudah tidak terhubung",
                    data: { 
                        user_id: parseInt(String(req.body.user_id)), 
                        role_id: parseInt(String(req.body.role_id)) 
                    }
                });
                return;
            }

            res.status(400).json({ 
                message: error.message || "Gagal menghapus peran" 
            });
        }
    })();
});

export default router;