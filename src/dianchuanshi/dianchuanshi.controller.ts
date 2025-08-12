import { Router, Request, Response } from "express";
import { getAllDianChuanShiService } from "./dianchuanshi.service";

export const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const data = await getAllDianChuanShiService();
        res.json(data);
    } catch (error) {
        res.status(500).json("Gagal mengambil data Dian Chuan Shi");
    }
});

export default router;
