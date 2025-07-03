const express = require("express");
const router = express.Router();
const exportService = require("./export.service");

router.get("/qiudao", async (req, res) => {
    try {
        const workbookBuffer = await exportService.generateQiudaoExcel();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=qiudao_data.xlsx");

        res.send(workbookBuffer);
    } catch (error) {
        console.error("[EXPORT DATA QIUDAO] Gagal export Excel:", error);
        res.status(500).json({ message: "Gagal mengekspor data" });
    }
});

router.get("/umat", async (req, res) => {
    try {
        const workbookBuffer = await exportService.generateUserExcel();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=umat_data.xlsx");

        res.send(workbookBuffer);
    } catch (error) {
        console.error("[EXPORT DATA UMAT] Gagal export Excel:", error);
        res.status(500).json({ message: "Gagal mengekspor data" });
    }
})

module.exports = router;
