import express, { Request, Response, NextFunction } from "express";
import {
  registerUser,
  fetchAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  updateOwnProfile,
} from "./user.service";
import { authenticateJWT } from "../../middleware/authentication";
import { authorize } from "../../middleware/authorization";
import { Korwil, Prisma, User } from "@prisma/client";
import prisma from "../../db";
import { UserWithRelations } from "../../types/user";

interface AuthRequest extends Request {
  user?: {
    credential_id: number;
    username: string;
    user_info_id: number;
    scope?: string;
  };
  userScope?: string;
  userArea?: Korwil;
}

interface JwtPayload {
  credential_id: number;
  username: string;
  user_info_id: number;
}

declare module "express" {
  interface Request {
    queryParsed?: Record<string, any>;
    user?: JwtPayload;
    userScope?: string;
    userLocationId?: number;
    userArea?: Korwil;
  }
}

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "umat", action: "create", scope: "wilayah" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let qiu_dao_id = req.body.qiu_dao_id;

      if (req.userScope === "wilayah" && req.userArea) {
        const qiuDao = await prisma.qiuDao.findFirst({
          where: {
            qiu_dao_location: {
              area: req.userArea,
            },
          },
          select: { qiu_dao_id: true },
        });

        if (!qiuDao) {
          res.status(400).json({ message: "No QiuDao found for the Admin's area" });
          return;
        }
        qiu_dao_id = qiuDao.qiu_dao_id;
      }

      await registerUser({
        ...req.body,
        qiu_dao_id,
        domicile_location_id: req.body.domicile_location_id,
        id_card_location_id: req.body.id_card_location_id,
      });
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("=== DEBUG GET /users ===");
      console.log("User:", req.user);
      console.log("Scope:", req.userScope);
      console.log("Area:", req.userArea);
      console.log("Query Params:", req.query);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const searchField = (req.query.searchField as string) || "full_name";

      const spiritualStatus = req.queryParsed?.spiritualStatus as string[] | string | undefined || req.query.spiritualStatus as string[] | string | undefined;
      const job_name = req.queryParsed?.job_name as string[] | string | undefined || req.query.job_name as string[] | string | undefined;
      const last_education_level = req.queryParsed?.last_education_level as string[] | string | undefined || req.query.last_education_level as string[] | string | undefined;
      const is_qing_kou = req.queryParsed?.is_qing_kou as string[] | string | undefined || req.query.is_qing_kou as string[] | string | undefined;
      const gender = req.queryParsed?.gender as string[] | string | undefined || req.query.gender as string[] | string | undefined;
      const blood_type = req.queryParsed?.blood_type as string[] | string | undefined || req.query.blood_type as string[] | string | undefined;

      const spiritualStatusArray = Array.isArray(spiritualStatus) ? spiritualStatus : spiritualStatus ? [spiritualStatus] : undefined;
      const jobNameArray = Array.isArray(job_name) ? job_name : job_name ? [job_name] : undefined;
      const educationLevelArray = Array.isArray(last_education_level) ? last_education_level : last_education_level ? [last_education_level] : undefined;
      const qingKouArray = Array.isArray(is_qing_kou) ? is_qing_kou : is_qing_kou ? [is_qing_kou] : undefined;
      const genderArray = Array.isArray(gender) ? gender : gender ? [gender] : undefined;
      const bloodTypeArray = Array.isArray(blood_type) ? blood_type : blood_type ? [blood_type] : undefined;

      // Restrict to own data for users with "self" scope
      const fetchOptions: any = {
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
      };

      if (req.userScope === "self") {
        fetchOptions.userId = req.user!.user_info_id; // Only fetch own data
      } else if (req.userScope === "wilayah") {
        fetchOptions.userArea = req.userArea; // Filter by wilayah
      }

      const users = await fetchAllUsers(fetchOptions);

      console.log("Fetched Users:", users.data);
      console.log("Total Users:", users.total);
      console.log("=== DEBUG END ===");

      res.status(200).json(users);
    } catch (error: any) {
      console.error("Error in GET /users:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  authenticateJWT,
  authorize({ feature: "umat", action: "read" }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.user!.user_info_id;

      // Restrict to own data for "self" scope
      if (req.userScope === "self" && userId !== currentUserId) {
        res.status(403).json({ message: "Forbidden: Can only view own data" });
        return;
      }

      const user = await getUserById(userId) as UserWithRelations | null;

      if (!user) {
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      if (req.userScope === "wilayah") {
        const userArea = user.qiudao?.qiu_dao_location?.area;
        if (userArea !== req.userArea) {
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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      if (req.userScope === "wilayah") {
        const userArea = user.qiudao?.qiu_dao_location?.area;
        if (userArea !== req.userArea) {
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
  authorize({ feature: "umat", action: "delete", scope: "wilayah" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Debug: Log user scope dan area
      console.log("=== DEBUG DELETE /user/:id ===");
      console.log("User Scope:", req.userScope);
      console.log("User Area:", req.userArea);
      console.log("User JWT:", req.user);

      const userId = parseInt(req.params.id);
      const user = await getUserById(userId) as UserWithRelations | null;

      if (!user) {
        console.log("User not found:", userId);
        res.status(404).json({ message: "User tidak ditemukan" });
        return;
      }

      // Check region untuk scope wilayah
      if (req.userScope === "wilayah") {
        const userArea = user.qiudao?.qiu_dao_location?.area as Korwil | undefined;
        console.log("Region check:", { userArea, reqUserArea: req.userArea });
        if (userArea !== req.userArea) {
          console.log("Region mismatch:", { userArea, reqUserArea: req.userArea });
          res.status(403).json({ message: "Forbidden: Cannot delete user from different region" });
          return;
        }
      }

      const deletedUser = await deleteUserById(userId);
      console.log("User deleted:", userId);
      res.status(200).json({
        message: "User berhasil dihapus",
        deletedUser,
      });
    } catch (error: any) {
      console.error("Delete Error:", error.message);
      res.status(400).json({ message: error.message });
    }
  }
);

export default router;