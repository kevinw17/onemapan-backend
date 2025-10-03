// qiudao.controller.ts (Fixed: Updated POST / creation validation to check selected location's area matches userArea instead of forcing first fotang)
import { Router, Request, Response, NextFunction } from "express";
import {
  registerQiuDao,
  fetchAllQiudao,
  getQiuDaoById,
  updateQiuDaoById,
  deleteQiuDaoById,
} from "./qiudao.service";
import { authenticateJWT } from "../../middleware/authentication";
import { authorize } from "../../middleware/authorization";
import { JwtPayload } from "../../types/express"; // Impor JwtPayload dari file tipe global
import prisma from "../../db"; // Import prisma untuk validasi di POST

const router = Router();

// Create QiuDao
router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "create", scope: "wilayah" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("DEBUG POST /qiudao: userScope=", req.userScope, "userArea=", req.userArea, "userLocationId=", req.userLocationId, "body:", req.body); // Debug: Cek scope/area/body di create

      // Validasi lokasi jika wilayah (hanya fotang dari area user)
      if (req.userScope === "wilayah" && req.userArea) {
        const selectedFotangId = parseInt(req.body.qiu_dao_location_id);
        if (selectedFotangId) {
          const fotang = await prisma.fotang.findUnique({
            where: { fotang_id: selectedFotangId },
            select: { area: true },
          });
          if (!fotang) {
            res.status(404).json({ message: "Lokasi Vihara tidak ditemukan" });
            return;
          }
          if (fotang.area !== req.userArea) {
            res.status(403).json({ message: "Forbidden: Lokasi harus dari wilayah yang sama" });
            return;
          }
          console.log("DEBUG: Selected fotang area matches userArea:", { fotangArea: fotang.area, userArea: req.userArea });
        } else {
          res.status(400).json({ message: "Lokasi Vihara wajib dipilih" });
          return;
        }
      }

      const data = {
        ...req.body,
        qiu_dao_location_id: parseInt(req.body.qiu_dao_location_id),
      };
      console.log("DEBUG: Creating Qiudao with data:", data);
      const qiuDao = await registerQiuDao(data);
      res.status(201).json({ qiu_dao_id: qiuDao.qiu_dao_id });
    } catch (error: any) {
      console.error("Create QiuDao error:", error.message);
      res.status(400).json({ message: error.message });
    }
  }
);

// Get all QiuDao (filtered by scope)
router.get(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "read" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("DEBUG GET /qiudao: userScope=", req.userScope, "userArea=", req.userArea, "userLocationId=", req.userLocationId, "query=", req.query); // Debug: Cek scope/area/query

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const searchField = (req.query.searchField as string) || "qiu_dao_mandarin_name";

      const fetchOptions = {
        page,
        limit,
        search,
        searchField,
      } as any; // Type assertion agar bisa tambah userId/area (fix TS error)

      // Filter berdasarkan scope (mirip user.controller.ts)
      if (req.userScope === "self") {
        fetchOptions.userId = req.user!.user_info_id;
      } else if (req.userScope === "wilayah") {
        fetchOptions.area = req.userArea; // Ganti dari qiu_dao_location_id ke area (sesuai service interface)
      }
      // Nasional: no filter, lihat semua

      console.log("DEBUG: fetchOptions passed to service:", fetchOptions); // Debug: Cek options yang dipass

      const qiudaoList = await fetchAllQiudao(fetchOptions);

      res.status(200).json(qiudaoList);
    } catch (error: any) {
      console.error("Error in GET /qiudao:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Get QiuDao by ID
router.get(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "read" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("DEBUG GET /qiudao/:id: userScope=", req.userScope, "userArea=", req.userArea); // Debug: Cek scope/area di detail

      const id = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(id);

      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      // Validasi self: check if qiudao.qiu_dao_id == user.qiu_dao_id
      if (req.userScope === "self") {
        const user = await prisma.user.findUnique({
          where: { user_info_id: req.user!.user_info_id },
          select: { qiu_dao_id: true },
        });
        if (id !== user?.qiu_dao_id) {
          res.status(403).json({ message: "Tidak Diizinkan: Anda hanya dapat melihat data Anda sendiri." });
          return;
        }
      }

      // Validasi wilayah: cek area qiudao == user area (bukan location_id, agar konsisten)
      if (req.userScope === "wilayah") {
        const qiudaoArea = qiudao.qiu_dao_location?.area;
        if (qiudaoArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: QiuDao dari wilayah lain" });
          return;
        }
      }

      res.status(200).json(qiudao);
    } catch (error: any) {
      console.error("Error in GET /qiudao/:id:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Update QiuDao
router.patch(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "update" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("DEBUG PATCH /qiudao/:id: userScope=", req.userScope, "userArea=", req.userArea); // Debug: Cek scope/area di update

      const qiuDaoId = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(qiuDaoId);

      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      // Validasi self: check if qiudao.qiu_dao_id == user.qiu_dao_id (though update may not be allowed for self, but add for consistency)
      if (req.userScope === "self") {
        const user = await prisma.user.findUnique({
          where: { user_info_id: req.user!.user_info_id },
          select: { qiu_dao_id: true },
        });
        if (qiuDaoId !== user?.qiu_dao_id) {
          res.status(403).json({ message: "Tidak Diizinkan: Anda hanya dapat mengupdate data Anda sendiri." });
          return;
        }
      }

      // Validasi wilayah: cek area qiudao == user area
      if (req.userScope === "wilayah") {
        const qiudaoArea = qiudao.qiu_dao_location?.area;
        if (qiudaoArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Cannot update QiuDao from different region" });
          return;
        }
      }

      const updatedQiuDao = await updateQiuDaoById(qiuDaoId, req.body);
      res.status(200).json({
        message: "Data QiuDao berhasil diperbarui",
        data: updatedQiuDao,
      });
    } catch (error: any) {
      console.error("Error in PATCH /qiudao/:id:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete QiuDao
router.delete(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "delete", scope: ["nasional", "wilayah"] }),
  async (req: Request, res: Response, next: Function): Promise<void> => {
    try {
      console.log("DEBUG DELETE /qiudao/:id: userScope=", req.userScope, "userArea=", req.userArea); // Debug: Cek scope/area di delete

      const qiuDaoId = parseInt(req.params.id);
      if (!qiuDaoId || isNaN(qiuDaoId)) {
        res.status(400).json({ message: "ID qiudao tidak valid" });
        return;
      }

      const qiudao = await getQiuDaoById(qiuDaoId);
      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      // Validasi wilayah: cek area qiudao == user area
      if (req.userScope === "wilayah") {
        const qiudaoArea = qiudao.qiu_dao_location?.area;
        if (qiudaoArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Cannot delete QiuDao from different region" });
          return;
        }
      }

      const deletedQiuDao = await deleteQiuDaoById(qiuDaoId);
      res.status(200).json({
        message: "Data QiuDao berhasil dihapus",
        deletedQiuDao,
      });
    } catch (error: any) {
      console.error("Delete QiuDao Error:", error.message);
      res.status(400).json({ message: error.message });
    }
  }
);

export default router;