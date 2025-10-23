import express, { Request, Response } from "express";
import { generateQiudaoExcel, generateUserExcel } from "./export.service";

const router = express.Router();

router.get("/qiudao", async (req: Request, res: Response) => {
    try {
        const workbookBuffer = await generateQiudaoExcel();

        res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
        "Content-Disposition",
        "attachment; filename=qiudao_data.xlsx"
        );

        res.send(workbookBuffer);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengekspor data" });
    }
});

router.get("/umat", async (req: Request, res: Response) => {
    try {
        const workbookBuffer = await generateUserExcel();

        res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
        "Content-Disposition",
        "attachment; filename=umat_data.xlsx"
        );

        res.send(workbookBuffer);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengekspor data" });
    }
});

export default router;
