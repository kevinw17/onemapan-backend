import { Router, Request, Response } from "express";
import { changeUserPassword } from "./change-password.service";
import { authenticateJWT } from "../middleware/authentication";

const router = Router();

router.post("/", authenticateJWT, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.user_info_id as string;

        if (!userId || typeof userId !== "number") {
            res.status(401).json({ message: "Unauthorized: User tidak valid" });
            return;
        }

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            res.status(400).json({ message: "Password lama dan baru wajib diisi" });
            return;
        }

        await changeUserPassword(userId, oldPassword, newPassword);

        res.status(200).json({
            message: "Password berhasil diganti. Silakan login ulang untuk keamanan.",
        });
    } catch (error: any) {
        console.error("Change password error:", error);
        res.status(400).json({
            message: error.message || "Gagal mengganti password",
        });
    }
});

export default router;