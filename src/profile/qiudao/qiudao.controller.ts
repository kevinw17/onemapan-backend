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
import { Korwil } from "@prisma/client";
import prisma from "../../db";

const router = Router();

router.get(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "read" }),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized: No user data in request" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const searchField = (req.query.searchField as string) || "qiu_dao_mandarin_name";

      const fetchOptions = {
        page,
        limit,
        search,
        searchField,
        area: req.userScope === "wilayah" ? req.userArea : undefined,
        userId: req.userScope === "self" && req.userRole !== "user" ? req.user.user_info_id : undefined,
      };


      const qiudaoList = await fetchAllQiudao(fetchOptions);

      res.status(200).json(qiudaoList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "read" }),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized: No user data in request" });
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
          res.status(403).json({ message: "Forbidden: You can only view your own qiudao data" });
          return;
        }
      }

      if (req.userScope === "wilayah") {
        const qiudaoArea = qiudao.qiu_dao_location?.area;
        if (qiudaoArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: QiuDao dari wilayah lain" });
          return;
        }
      }

      res.status(200).json(qiudao);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "create", scope: ["nasional", "wilayah"] }),
  async (req: Request, res: Response) => {
    try {
      const qiu_dao_location_id = parseInt(req.body.qiu_dao_location_id);
      if (req.userScope === "wilayah" && req.userArea) {
        const selectedFotang = await prisma.fotang.findUnique({
          where: { fotang_id: qiu_dao_location_id },
          select: { area: true },
        });
        if (!selectedFotang) {
          res.status(404).json({ message: "Lokasi Vihara tidak ditemukan" });
          return;
        }
        if (selectedFotang.area !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Lokasi harus dari wilayah yang sama" });
          return;
        }
      }

      const data = {
        ...req.body,
        qiu_dao_location_id,
      };
      const qiuDao = await registerQiuDao(data);
      res.status(201).json({ qiu_dao_id: qiuDao.qiu_dao_id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.patch(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "update", scope: ["nasional", "wilayah"] }),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized: No user data in request" });
        return;
      }

      const qiuDaoId = parseInt(req.params.id);
      const qiudao = await getQiuDaoById(qiuDaoId);

      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah") {
        const qiudaoArea = qiudao.qiu_dao_location?.area;
        if (qiudaoArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Cannot update QiuDao from different region" });
          return;
        }
      }

      const updatedQiudao = await updateQiuDaoById(qiuDaoId, req.body);
      res.status(200).json({
        message: "Data QiuDao berhasil diperbarui",
        data: updatedQiudao,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "delete", scope: ["nasional", "wilayah"] }),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized: No user data in request" });
        return;
      }

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

      if (req.userScope === "wilayah") {
        const qiudaoArea = qiudao.qiu_dao_location?.area;
        if (qiudaoArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Cannot delete QiuDao from different region" });
          return;
        }
      }

      const deletedQiudao = await deleteQiuDaoById(qiuDaoId);
      res.status(200).json({
        message: "Data QiuDao berhasil dihapus",
        deletedQiudao,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
);

export default router;