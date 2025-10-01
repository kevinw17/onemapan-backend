import express, { Request, Response } from "express";
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

const router = express.Router();

// Get all roles
router.get("/", (req: Request, res: Response) => {
    void (async () => {
        try {
            const roles = await fetchAllRoles();
            res.status(200).json(roles);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

// Get role by ID
router.get("/:id", (req: Request, res: Response) => {
    void (async () => {
        try {
            const roleId = parseInt(req.params.id);
            const role = await getRoleById(roleId);
            if (!role) {
                return res.status(404).json({ message: "Peran tidak ditemukan" });
            }
            res.status(200).json(role);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

// Create a new role
router.post("/", (req: Request, res: Response) => {
    void (async () => {
        try {
            const { name, description, permissions } = req.body;
            const role = await createNewRole({ name, description, permissions });
            res.status(201).json({ id: role.role_id, message: "Peran berhasil dibuat" });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

// Update a role
router.put("/:id", (req: Request, res: Response) => {
    void (async () => {
        try {
            const roleId = parseInt(req.params.id);
            const { name, description, permissions } = req.body;
            const updatedRole = await updateRoleById(roleId, { name, description, permissions });
            res.status(200).json({
                message: "Peran berhasil diperbarui",
                data: updatedRole,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

// Delete a role
router.delete("/:id", (req: Request, res: Response) => {
    void (async () => {
        try {
            const roleId = parseInt(req.params.id);
            const deletedRole = await deleteRoleById(roleId);
            res.status(200).json({
                message: "Peran berhasil dihapus",
                data: deletedRole,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

// Assign role to user
router.post("/assign", (req: Request, res: Response) => {
    void (async () => {
        try {
            const { user_id, role_id } = req.body;
            const userRole = await assignRoleToUser(user_id, role_id);
            res.status(201).json({
                message: "Peran berhasil ditetapkan ke user",
                data: userRole,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

// Remove role from user
router.delete("/assign", (req: Request, res: Response) => {
    void (async () => {
        try {
            const { user_id, role_id } = req.body;
            const userRole = await removeRoleFromUser(user_id, role_id);
            res.status(200).json({
                message: "Peran berhasil dihapus dari user",
                data: userRole,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    })();
});

// Get roles for a user
router.get("/user/:user_id", (req: Request, res: Response) => {
    void (async () => {
        try {
            const userId = parseInt(req.params.user_id);
            const userRoles = await getRolesByUserId(userId);
            res.status(200).json(userRoles);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

export default router;