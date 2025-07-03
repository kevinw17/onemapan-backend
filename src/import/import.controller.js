const express = require("express");
const router = express.Router();
const importService = require("./import.service");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/umat", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "File tidak ditemukan dalam request" });
        }

        await importService.importUmatFromExcel(req.file.buffer);
        res.json({ message: "Berhasil mengimpor data" });
    } catch (err) {
        console.error("[IMPORT DATA] Gagal:", err.message);
        res.status(500).json({ message: "Gagal mengimpor data", detail: err.message });
    }
});

router.post("/qiudao", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "File tidak ditemukan dalam request" });
        }

        await importService.importQiudaoFromExcel(req.file.buffer);
        res.json({ message: "Berhasil mengimpor data Qiudao" });
    } catch (err) {
        console.error("[IMPORT QIUDAO] Gagal:", err.message);
        res.status(500).json({ message: "Gagal mengimpor data Qiudao", detail: err.message });
    }
});

module.exports = router;
