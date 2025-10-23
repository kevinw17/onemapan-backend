import express, { Request, Response, NextFunction } from "express";
import {
  registerUser,
  fetchAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "./user.service";
import { authenticateJWT, JwtPayload } from "../../middleware/authentication";
import { authorize } from "../../middleware/authorization";
import { Korwil } from "@prisma/client";
import prisma from "../../db";
import { UserWithRelations } from "../../types/user";

interface AuthRequest extends Request {
  user?: JwtPayload;
  userScope?: string;
  userArea?: Korwil;
}

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "umat", action: "create", scope: "wilayah" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qiu_dao_id = parseInt(req.body.qiu_dao_id);
      if (req.userScope === "wilayah" && req.userArea) {
        if (!qiu_dao_id) {
          res.status(400).json({ message: "QiuDao ID wajib dipilih" });
          return;
        }
        const qiuDao = await prisma.qiuDao.findUnique({
          where: { qiu_dao_id },
          include: { qiu_dao_location: true },
        });
        if (!qiuDao) {
          res.status(404).json({ message: "QiuDao tidak ditemukan" });
          return;
        }
        if (qiuDao.qiu_dao_location?.area !== req.userArea) {
          res.status(403).json({ message: "Forbidden: QiuDao harus dari wilayah yang sama" });
          return;
        }
      }

      const data = {
        ...req.body,
        qiu_dao_id,
        domicile_location_id: parseInt(req.body.domicile_location_id),
        id_card_location_id: parseInt(req.body.id_card_location_id),
      };
      await registerUser(data);
      res.status(201).send("User registered successfully");
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/",
  authenticateJWT,
  authorize({ feature: "umat", action: "read" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized: No user data available" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const searchField = (req.query.searchField as string) || "full_name";

      const spiritualStatus = req.query.spiritualStatus as string[] | string | undefined;
      const job_name = req.query.job_name as string[] | string | undefined;
      const last_education_level = req.query.last_education_level as string[] | string | undefined;
      const is_qing_kou = req.query.is_qing_kou as string[] | string | undefined;
      const gender = req.query.gender as string[] | string | undefined;
      const blood_type = req.query.blood_type as string[] | string | undefined;

      const spiritualStatusArray = Array.isArray(spiritualStatus) ? spiritualStatus : spiritualStatus ? [spiritualStatus] : undefined;
      const jobNameArray = Array.isArray(job_name) ? job_name : job_name ? [job_name] : undefined;
      const educationLevelArray = Array.isArray(last_education_level) ? last_education_level : last_education_level ? [last_education_level] : undefined;
      const qingKouArray = Array.isArray(is_qing_kou) ? is_qing_kou : is_qing_kou ? [is_qing_kou] : undefined;
      const genderArray = Array.isArray(gender) ? gender : gender ? [gender] : undefined;
      const bloodTypeArray = Array.isArray(blood_type) ? blood_type : blood_type ? [blood_type] : undefined;

      let userArea: Korwil | undefined;
      if (req.userScope === "wilayah" && req.userArea) {
        userArea = req.userArea;
      } else if (req.user.role !== "Super Admin" && req.user.area) {
        userArea = req.user.area as Korwil;
      }

      const fetchOptions = {
        page,
        limit,
        search,
        searchField,
        spiritualStatus: spiritualStatusArray,
        job_name: jobNameArray,
        last_education_level: educationLevelArray,
        is_qing_kou: qingKouArray,
        gender: genderArray,
        blood_type: bloodTypeArray,
        userArea,
        userId: req.userScope === "self" && req.user.role !== "user" ? req.user.user_info_id : undefined,
      };

      const users = await fetchAllUsers(fetchOptions);

      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  authenticateJWT,
  authorize({ feature: "umat", action: "read" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.user!.user_info_id;

      if (req.userScope === "self" && req.user!.role !== "user") {
        if (userId !== currentUserId) {
          res.status(403).json({ message: "Forbidden: Can only view own data" });
          return;
        }
      }

      const user = await getUserById(userId) as UserWithRelations | null;

      if (!user) {
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.area || user.qiudao?.qiu_dao_location?.area;
        if (userArea && userArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: User dari wilayah lain" });
          return;
        }
      }

      res.status(200).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.patch(
  "/:id",
  authenticateJWT,
  authorize({ feature: "umat", action: "update" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.user!.user_info_id;

      if (userId === currentUserId) {
        const updatedUser = await updateUserById(userId, req.body);
        res.status(200).json({
          message: "Profil berhasil diperbarui",
          data: updatedUser,
        });
        return;
      }

      const user = await getUserById(userId) as UserWithRelations | null;

      if (!user) {
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.area || user.qiudao?.qiu_dao_location?.area;
        if (userArea && userArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Cannot update user from different region" });
          return;
        }
      }

      const updatedUser = await updateUserById(userId, req.body);
      res.status(200).json({
        message: "User berhasil diperbarui",
        data: updatedUser,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete(
  "/:id",
  authenticateJWT,
  authorize({ feature: "umat", action: "delete", scope: ["nasional", "wilayah"] }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const user = await getUserById(userId) as UserWithRelations | null;

      if (!user) {
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.area || user.qiudao?.qiu_dao_location?.area;
        if (userArea && userArea !== req.userArea) {
          res.status(403).json({ message: "Forbidden: Cannot delete user from different region" });
          return;
        }
      }

      const deletedUser = await deleteUserById(userId);
      res.status(200).json({
        message: "User berhasil dihapus",
        deletedUser,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
);

export default router;