import { Router, Request, Response } from "express";
import { getDashboardStats } from "./dashboard.service";
import { authenticateJWT } from "../middleware/authentication";

const router = Router();

router.get(
    "/stats",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
        const stats = await getDashboardStats();
        res.json(stats);
        } catch (error: any) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: "Gagal mengambil data dashboard" });
        }
    }
);

export default router;