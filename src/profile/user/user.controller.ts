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

// Create User
router.post(
  "/",
  authenticateJWT,
  authorize({ feature: "umat", action: "create", scope: "wilayah" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("=== DEBUG POST /profile/user ===");
      console.log("userScope:", req.userScope);
      console.log("userArea:", req.userArea);
      console.log("body:", req.body);

      const qiu_dao_id = parseInt(req.body.qiu_dao_id);
      if (req.userScope === "wilayah" && req.userArea) {
        if (!qiu_dao_id) {
          console.warn("No qiu_dao_id provided for wilayah user");
          res.status(400).json({ message: "QiuDao ID wajib dipilih" });
          return;
        }
        const qiuDao = await prisma.qiuDao.findUnique({
          where: { qiu_dao_id },
          include: { qiu_dao_location: true },
        });
        if (!qiuDao) {
          console.warn("QiuDao not found for ID:", qiu_dao_id);
          res.status(404).json({ message: "QiuDao tidak ditemukan" });
          return;
        }
        if (qiuDao.qiu_dao_location?.area !== req.userArea) {
          console.warn("QiuDao area mismatch:", { qiuDaoArea: qiuDao.qiu_dao_location?.area, userArea: req.userArea });
          res.status(403).json({ message: "Forbidden: QiuDao harus dari wilayah yang sama" });
          return;
        }
        console.log("DEBUG: QiuDao area matches userArea:", { qiuDaoArea: qiuDao.qiu_dao_location?.area, userArea: req.userArea });
      }

      const data = {
        ...req.body,
        qiu_dao_id,
        domicile_location_id: parseInt(req.body.domicile_location_id),
        id_card_location_id: parseInt(req.body.id_card_location_id),
      };
      console.log("DEBUG: Creating User with data:", data);
      await registerUser(data);
      res.status(201).send("User registered successfully");
    } catch (error: any) {
      console.error("Error in POST /profile/user:", error.message);
      res.status(400).json({ message: error.message });
    }
  }
);

// Get all Users (filtered by scope)
router.get(
  "/",
  authenticateJWT,
  authorize({ feature: "umat", action: "read" }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("=== DEBUG GET /profile/user ===");
      console.log("User:", req.user);
      console.log("Scope:", req.userScope);
      console.log("Area:", req.userArea);
      console.log("Query Params:", req.query);

      if (!req.user) {
        console.error("No user found in request after authentication");
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
        console.warn("Using req.user.area as fallback due to unexpected userScope:", req.userScope);
      } else {
        console.log("No area filter applied (Super Admin or no area specified)");
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

      console.log("Fetch Options:", fetchOptions);

      const users = await fetchAllUsers(fetchOptions);
      console.log("Total Users:", users.total);
      console.log("=== DEBUG END ===");

      res.status(200).json(users);
    } catch (error: any) {
      console.error("Error in GET /profile/user:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Get User by ID
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

      console.log("DEBUG: User Data:", {
        userId: user.user_info_id,
        full_name: user.full_name,
        qiudao: user.qiudao ? {
          qiu_dao_id: user.qiudao.qiu_dao_id,
          qiu_dao_location: user.qiudao.qiu_dao_location ? { area: user.qiudao.qiu_dao_location.area } : null,
        } : null,
        area: user.area,
      });

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.area || user.qiudao?.qiu_dao_location?.area;
        if (userArea && userArea !== req.userArea) {
          console.warn("Region mismatch:", { userArea, reqUserArea: req.userArea });
          res.status(403).json({ message: "Forbidden: User dari wilayah lain" });
          return;
        }
      }

      res.status(200).json(user);
    } catch (error: any) {
      console.error("Error in GET /profile/user/:id:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Update User
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

      console.log("DEBUG: User Data for Update:", {
        userId: user.user_info_id,
        full_name: user.full_name,
        qiudao: user.qiudao ? {
          qiu_dao_id: user.qiudao.qiu_dao_id,
          qiu_dao_location: user.qiudao.qiu_dao_location ? { area: user.qiudao.qiu_dao_location.area } : null,
        } : null,
        area: user.area,
      });

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.area || user.qiudao?.qiu_dao_location?.area;
        if (userArea && userArea !== req.userArea) {
          console.warn("Region mismatch for update:", { userArea, reqUserArea: req.userArea });
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
      console.error("Error in PATCH /profile/user/:id:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete User
router.delete(
  "/:id",
  authenticateJWT,
  authorize({ feature: "umat", action: "delete", scope: ["nasional", "wilayah"] }),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("=== DEBUG DELETE /profile/user/:id ===");
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

      console.log("DEBUG: User Data for Delete:", {
        userId: user.user_info_id,
        full_name: user.full_name,
        qiudao: user.qiudao ? {
          qiu_dao_id: user.qiudao.qiu_dao_id,
          qiu_dao_location: user.qiudao.qiu_dao_location ? { area: user.qiudao.qiu_dao_location.area } : null,
        } : null,
        area: user.area,
      });

      if (req.userScope === "wilayah" && req.userArea) {
        const userArea = user.area || user.qiudao?.qiu_dao_location?.area;
        if (userArea && userArea !== req.userArea) {
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