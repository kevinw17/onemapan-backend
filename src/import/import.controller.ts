import express, { Request, Response } from "express";
import multer from "multer";
import { importUmatFromExcel, importQiudaoFromExcel } from "./import.service";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function handleFileMissing(res: Response) {
    return res.status(400).json({ message: "File tidak ditemukan dalam request" });
}

router.post("/umat", upload.single("file"), (req: Request, res: Response) => {
    void (async () => {
        try {
        if (!req.file) return handleFileMissing(res);

        const result = await importUmatFromExcel(req.file.buffer);
        res.status(200).json({ message: "Berhasil mengimpor data", detail: result });
        } catch (err: any) {
        console.error("[IMPORT UMAT] Gagal:", err.message);
        res.status(500).json({
            message: "Gagal mengimpor data",
            error: err.message,
        });
        }
    })();
});

router.post("/qiudao", upload.single("file"), (req: Request, res: Response) => {
    void (async () => {
        try {
        if (!req.file) return handleFileMissing(res);

        const result = await importQiudaoFromExcel(req.file.buffer);
        res.status(200).json({ message: "Berhasil mengimpor data Qiudao", detail: result });
        } catch (err: any) {
        console.error("[IMPORT QIUDAO] Gagal:", err.message);
        res.status(500).json({
            message: "Gagal mengimpor data Qiudao",
            error: err.message,
        });
        }
    })();
});

export default router;
