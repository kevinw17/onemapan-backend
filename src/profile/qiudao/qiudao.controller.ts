// qiudao.controller.ts
import { Router, Request, Response, NextFunction } from "express";
import {
  registerQiuDao,
  fetchAllQiudao,
  getQiuDaoById,
  updateQiuDaoById,
  deleteQiuDaoById,
} from "./qiudao.service";
import { authenticateJWT, JwtPayload } from "../../middleware/authentication"; // JwtPayload
import { authorize } from "../../middleware/authorization";
import { Korwil } from "@prisma/client";
import prisma from "../../db";

// TAMBAHKAN INI!
interface AuthRequest extends Request {
  user?: JwtPayload;
  userScope?: string;
  userArea?: Korwil;
  userRole?: string;
}

const router = Router();

router.get(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "read" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // 1. Basic search: HANYA 1 nilai
      const rawSearch = req.query.search;
      const rawSearchField = req.query.searchField;

      const search = Array.isArray(rawSearch)
        ? (rawSearch[0] as string) || ""
        : (rawSearch as string) || "";

      const searchField = Array.isArray(rawSearchField)
        ? (rawSearchField[0] as string) || "qiu_dao_mandarin_name"
        : (rawSearchField as string) || "qiu_dao_mandarin_name";

      // 2. Multiple filters: pakai []
      const location_name = req.query["location_name[]"];
      const location_mandarin_name = req.query["location_mandarin_name[]"];
      const dian_chuan_shi_name = req.query["dian_chuan_shi_name[]"];
      const dian_chuan_shi_mandarin_name = req.query["dian_chuan_shi_mandarin_name[]"];
      const yin_shi_qd_name = req.query["yin_shi_qd_name[]"];
      const yin_shi_qd_mandarin_name = req.query["yin_shi_qd_mandarin_name[]"];
      const bao_shi_qd_name = req.query["bao_shi_qd_name[]"];
      const bao_shi_qd_mandarin_name = req.query["bao_shi_qd_mandarin_name[]"];

      const toArray = (param: any): string[] => {
        if (!param) return [];
        return Array.isArray(param) ? param.map(String) : [String(param)];
      };

      const fetchOptions = {
        page,
        limit,
        search,
        searchField,
        location_name: toArray(location_name),
        location_mandarin_name: toArray(location_mandarin_name),
        dian_chuan_shi_name: toArray(dian_chuan_shi_name),
        dian_chuan_shi_mandarin_name: toArray(dian_chuan_shi_mandarin_name),
        yin_shi_qd_name: toArray(yin_shi_qd_name),
        yin_shi_qd_mandarin_name: toArray(yin_shi_qd_mandarin_name),
        bao_shi_qd_name: toArray(bao_shi_qd_name),
        bao_shi_qd_mandarin_name: toArray(bao_shi_qd_mandarin_name),
        userId: req.userScope === "self" && req.userRole !== "user" ? req.user.user_info_id : undefined,
        userArea: req.userScope === "wilayah" ? req.userArea : undefined, // Tambahkan userArea untuk wilayah
      };

      const qiudaoList = await fetchAllQiudao(fetchOptions);
      res.status(200).json(qiudaoList);
    } catch (error: any) {
      console.error("[GET /qiudao] Error:", error);
      next(error);
    }
  }
);

// GET BY ID
router.get(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "read" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const id = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(id);
      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      if (req.userScope === "self" && req.userRole !== "user") {
        const user = await prisma.user.findUnique({
          where: { user_info_id: req.user.user_info_id },
          select: { qiu_dao_id: true },
        });
        if (id !== user?.qiu_dao_id) {
          res.status(403).json({ message: "Forbidden: Bukan QiuDao Anda" });
          return;
        }
      }

      if (req.userScope === "wilayah" && req.userArea) {
        if (qiudao.qiu_dao_location?.area !== req.userArea) {
          res.status(403).json({ message: "Forbidden: QiuDao dari wilayah lain" });
          return;
        }
      }

      res.status(200).json(qiudao);
    } catch (error: any) {
      next(error);
    }
  }
);

// CREATE
router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "create", scope: ["nasional", "wilayah"] }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qiu_dao_location_id = parseInt(req.body.qiu_dao_location_id);
      if (req.userScope === "wilayah" && req.userArea) {
        const fotang = await prisma.fotang.findUnique({
          where: { fotang_id: qiu_dao_location_id },
          select: { area: true },
        });
        if (!fotang) {
          res.status(404).json({ message: "Lokasi tidak ditemukan" });
          return;
        }
        if (fotang.area !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Lokasi dari wilayah lain" });
          return;
        }
      }

      const data = { ...req.body, qiu_dao_location_id };
      const qiuDao = await registerQiuDao(data);
      res.status(201).json({ qiu_dao_id: qiuDao.qiu_dao_id });
    } catch (error: any) {
      next(error);
    }
  }
);

// UPDATE
router.patch(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "update", scope: ["nasional", "wilayah"] }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(id);
      if (!qiudao) {
        res.status(404).json({ message: "QiuDao tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah" && qiudao.qiu_dao_location?.area !== req.userArea) {
        res.status(403).json({ message: "Forbidden: Wilayah berbeda" });
        return;
      }

      const updated = await updateQiuDaoById(id, req.body);
      res.status(200).json({ message: "Berhasil diperbarui", data: updated });
    } catch (error: any) {
      next(error);
    }
  }
);

// DELETE
router.delete(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "delete", scope: ["nasional", "wilayah"] }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ message: "ID tidak valid" });
        return;
      }

      const qiudao = await getQiuDaoById(id);
      if (!qiudao) {
        res.status(404).json({ message: "QiuDao tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah" && qiudao.qiu_dao_location?.area !== req.userArea) {
        res.status(403).json({ message: "Forbidden: Wilayah berbeda" });
        return;
      }

      const deleted = await deleteQiuDaoById(id);
      res.status(200).json({ message: "Berhasil dihapus", deletedQiudao: deleted });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;