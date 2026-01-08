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
import { isNationalAccessRole } from "../../role/roleUtils";

interface AuthRequest extends Request {
  user?: JwtPayload;
  userScope?: string;
  userArea?: Korwil;
}

const router = express.Router();

const toArray = (param: any): string[] | undefined => {
  if (!param) return undefined;
  return Array.isArray(param) ? param : [param];
};

router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "umat", action: "create", scope: "wilayah" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qiu_dao_id = req.body.qiu_dao_id;
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
        qiu_dao_id: qiu_dao_id,
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

      const spiritualStatus = req.query['spiritualStatus[]'];
      const job_name = req.query['job_name[]'];
      const last_education_level = req.query['last_education_level[]'];
      const is_qing_kou = req.query['is_qing_kou[]'];
      const gender = req.query['gender[]'];
      const blood_type = req.query['blood_type[]'];

      const spiritualStatusArray = toArray(spiritualStatus);
      const jobNameArray = toArray(job_name);
      const educationLevelArray = toArray(last_education_level);
      const qingKouArray = toArray(is_qing_kou);
      const genderArray = toArray(gender);
      const bloodTypeArray = toArray(blood_type);
      
      let userArea: Korwil | undefined = undefined;
      let fotangId: number | undefined = undefined;

      if (!isNationalAccessRole(req.user?.role)) {
        if (req.user?.role === "Admin") {
          userArea = req.userArea || (req.user?.area as Korwil);
        }

        if (req.user?.role === "Admin Vihara") {
          const currentUser = await prisma.user.findUnique({
            where: { user_info_id: String(req.user.user_info_id) },
            include: { qiudao: true },
          });

          fotangId = currentUser?.qiudao?.qiu_dao_location_id;

          if (!fotangId) {
            res.status(403).json({ message: "Admin Vihara tidak terhubung ke vihara manapun" });
            return;
          }
        }
      }

      if (req.userScope === "nasional") {
        userArea = undefined;
        fotangId = undefined;
      } else if (req.userScope === "wilayah") {
        userArea = req.userArea;
        if (!userArea) {
          res.status(400).json({ message: "Wilayah pengguna tidak didefinisikan" });
          return;
        }
      } else if (req.userScope === "fotang") {
        const currentUser = await prisma.user.findUnique({
          where: { user_info_id: String(req.user.user_info_id) },
          include: { qiudao: true },
        });

        fotangId = currentUser?.qiudao?.qiu_dao_location_id;

        if (!fotangId) {
          res.status(403).json({ message: "Admin Vihara tidak terhubung ke vihara manapun" });
          return;
        }
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
        fotangId,
        userId: req.userScope === "self" ? (String(req.user.user_info_id)) : undefined,
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
      const id = req.params.id;
      const currentUserId = String(req.user!.user_info_id);;

      if (req.userScope === "self" && req.user!.role !== "user") {
        if (id !== currentUserId) {
          res.status(403).json({ message: "Forbidden: Can only view own data" });
          return;
        }
      }

      const user = await getUserById(id) as UserWithRelations | null;

      if (!user) {
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.qiudao?.qiu_dao_location?.area;
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
      const userId = req.params.id;
      const currentUserId = String(req.user!.user_info_id);;

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
      const userId = req.params.id;
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