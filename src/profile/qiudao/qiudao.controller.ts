import { Router, Request, Response, NextFunction } from "express";
import {
  registerQiuDao,
  fetchAllQiudao,
  getQiuDaoById,
  updateQiuDaoById,
  deleteQiuDaoById,
} from "./qiudao.service";
import { authenticateJWT, JwtPayload } from "../../middleware/authentication";
import { authorize } from "../../middleware/authorization";
import { Korwil } from "@prisma/client";
import prisma from "../../db";

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

      const search = (req.query.search as string) || "";
      const searchField = (req.query.searchField as string) || "qiu_dao_mandarin_name";

      const location_name = Array.isArray(req.query["location_name[]"]) ? req.query["location_name[]"].map(String) : req.query["location_name[]"] ? [String(req.query["location_name[]"])] : [];
      const location_mandarin_name = Array.isArray(req.query["location_mandarin_name[]"]) ? req.query["location_mandarin_name[]"].map(String) : req.query["location_mandarin_name[]"] ? [String(req.query["location_mandarin_name[]"])] : [];
      const dian_chuan_shi_name = Array.isArray(req.query["dian_chuan_shi_name[]"]) ? req.query["dian_chuan_shi_name[]"].map(String) : req.query["dian_chuan_shi_name[]"] ? [String(req.query["dian_chuan_shi_name[]"])] : [];
      const dian_chuan_shi_mandarin_name = Array.isArray(req.query["dian_chuan_shi_mandarin_name[]"]) ? req.query["dian_chuan_shi_mandarin_name[]"].map(String) : req.query["dian_chuan_shi_mandarin_name[]"] ? [String(req.query["dian_chuan_shi_mandarin_name[]"])] : [];

      const qiudaoPerm = req.user.permissions?.qiudao;
      let effectiveScope = "nasional";
      let effectiveArea: Korwil | undefined;
      let effectiveFotangId: number | undefined;

      if (qiudaoPerm) {
        const scopes = Array.isArray(qiudaoPerm.scope) ? qiudaoPerm.scope : [qiudaoPerm.scope || "nasional"];
        const priorityMap: Record<string, number> = { self: 4, fotang: 3, wilayah: 2, nasional: 1 };
        const sortedScopes = scopes.sort((a: string, b: string) => (priorityMap[b] || 0) - (priorityMap[a] || 0));
        effectiveScope = sortedScopes[0] || "nasional";

        if (effectiveScope === "wilayah") {
          effectiveArea = req.userArea ?? undefined;
        } else if (effectiveScope === "fotang") {
          const currentUser = await prisma.user.findUnique({
            where: { user_info_id: String(req.user.user_info_id) },
            select: { qiudao: { select: { qiu_dao_location_id: true } } },
          });
          effectiveFotangId = currentUser?.qiudao?.qiu_dao_location_id ?? undefined;
        }
      }

      const queryScope = req.query.scope as string;
      if (queryScope && ["self", "fotang", "wilayah", "nasional"].includes(queryScope)) {
        effectiveScope = queryScope;
      }

      const fetchOptions = {
        page,
        limit,
        search,
        searchField,
        location_name,
        location_mandarin_name,
        dian_chuan_shi_name,
        dian_chuan_shi_mandarin_name,
        userId: effectiveScope === "self" ? String(req.user.user_info_id) : undefined,
        userArea: effectiveScope === "wilayah" ? effectiveArea : undefined,
        fotangId: effectiveScope === "fotang" ? effectiveFotangId : undefined,
      };

      console.log("[FETCH QIUDAO] Effective Scope:", effectiveScope, "Options:", fetchOptions);

      const qiudaoList = await fetchAllQiudao(fetchOptions);
      res.status(200).json(qiudaoList);
    } catch (error: any) {
      console.error("[GET /qiudao] Error:", error);
      next(error);
    }
  }
);

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

      const id = req.params.id;
      const qiudao = await getQiuDaoById(id);

      if (!qiudao) {
        res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
        return;
      }

      if (req.userScope === "self" && req.userRole !== "user") {
        const user = await prisma.user.findUnique({
          where: { user_info_id: String(req.user.user_info_id) },
          select: { qiu_dao_id: true },
        });
        if (id !== user?.qiu_dao_id) {
          res.status(403).json({ message: "Forbidden: Bukan QiuDao Anda" });
          return;
        }
      }

      let fotangId: number | undefined = undefined;
      if (req.userScope === "fotang") {
        const currentUser = await prisma.user.findUnique({
          where: { user_info_id: String(req.user.user_info_id) },
          include: { qiudao: { select: { qiu_dao_location_id: true } } },
        });

        fotangId = currentUser?.qiudao?.qiu_dao_location_id;

        if (!fotangId) {
          res.status(403).json({ message: "User tidak terhubung ke vihara/fotang manapun" });
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

const checkFotangAccess = async (req: AuthRequest, qiudaoId?: string) => {
  if (req.user?.role !== "Admin Vihara") return true;

  const currentUser = await prisma.user.findUnique({
    where: { user_info_id: String(req.user.user_info_id) },
    include: { qiudao: { select: { qiu_dao_location_id: true } } },
  });

  const allowedFotangId = currentUser?.qiudao?.qiu_dao_location_id;
  if (!allowedFotangId) throw new Error("Admin Vihara tidak terhubung ke fotang");

  if (qiudaoId) {
    const qiudao = await prisma.qiuDao.findUnique({
      where: { qiu_dao_id: qiudaoId },
      select: { qiu_dao_location_id: true },
    });
    if (qiudao?.qiu_dao_location_id !== allowedFotangId) {
      throw new Error("Forbidden: Hanya bisa mengelola QiuDao di fotang sendiri");
    }
  } else if (req.body.qiu_dao_location_id) {
    if (parseInt(req.body.qiu_dao_location_id) !== allowedFotangId) {
      throw new Error("Forbidden: Hanya bisa membuat di fotang sendiri");
    }
  }

  return true;
};

router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "create" }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await checkFotangAccess(req);
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

router.patch(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "update" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      await checkFotangAccess(req, id);

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

router.delete(
  "/:id",
  authenticateJWT,
  authorize({ feature: "qiudao", action: "delete" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      await checkFotangAccess(req, id);

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