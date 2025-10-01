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

interface JwtPayload {
  credential_id: number;
  username: string;
  user_info_id: number;
}

declare module "express" {
  interface Request {
    user?: JwtPayload;
    userScope?: string;
    userLocationId?: number;
  }
}

const router = Router();

// Create QiuDao
router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "create", scope: "wilayah" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = {
        ...req.body,
        qiu_dao_location_id: req.userScope === "wilayah" ? req.userLocationId : req.body.qiu_dao_location_id,
      };
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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const searchField = (req.query.searchField as string) || "qiu_dao_mandarin_name";

      const qiudaoList = await fetchAllQiudao({
        page,
        limit,
        search,
        searchField,
        ...(req.userScope === "wilayah" && { qiu_dao_location_id: req.userLocationId }), // Filter wilayah
      });

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
      const id = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(id);

      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      // Cek wilayah untuk Admin/User
      if (req.userScope === "wilayah" && qiudao.qiu_dao_location_id !== req.userLocationId) {
        res.status(403).json({ message: "Forbidden: QiuDao dari wilayah lain" });
        return;
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
      const qiuDaoId = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(qiuDaoId);

      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      // Cek wilayah untuk Admin
      if (req.userScope === "wilayah" && qiudao.qiu_dao_location_id !== req.userLocationId) {
        res.status(403).json({ message: "Forbidden: Cannot update QiuDao from different region" });
        return;
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
  authorize({ feature: "qiudao", action: "delete", scope: "nasional" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      await deleteQiuDaoById(id);
      res.status(200).json({ message: "Data QiuDao berhasil dihapus" });
    } catch (error: any) {
      console.error("Error in DELETE /qiudao/:id:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;