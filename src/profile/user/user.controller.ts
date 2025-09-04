import express, { Request, Response } from "express";
import {
  registerUser,
  fetchAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "./user.service";

declare module "express" {
  interface Request {
    queryParsed?: Record<string, any>;
  }
}

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    await registerUser(req.body);
    res.status(201).send("User registered successfully");
  } catch (error: any) {
    res.status(400).send(error.message);
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const searchField = (req.query.searchField as string) || "full_name";

    // Ambil semua parameter dari req.query atau req.queryParsed
    const spiritualStatus = req.queryParsed?.spiritualStatus as string[] | string | undefined || req.query.spiritualStatus as string[] | string | undefined;
    const job_name = req.queryParsed?.job_name as string[] | string | undefined || req.query.job_name as string[] | string | undefined;
    const last_education_level = req.queryParsed?.last_education_level as string[] | string | undefined || req.query.last_education_level as string[] | string | undefined;
    const is_qing_kou = req.queryParsed?.is_qing_kou as string[] | string | undefined || req.query.is_qing_kou as string[] | string | undefined;
    const gender = req.queryParsed?.gender as string[] | string | undefined || req.query.gender as string[] | string | undefined;
    const blood_type = req.queryParsed?.blood_type as string[] | string | undefined || req.query.blood_type as string[] | string | undefined;

    // Konversi ke array jika perlu
    const spiritualStatusArray = Array.isArray(spiritualStatus) ? spiritualStatus : spiritualStatus ? [spiritualStatus] : undefined;
    const jobNameArray = Array.isArray(job_name) ? job_name : job_name ? [job_name] : undefined;
    const educationLevelArray = Array.isArray(last_education_level) ? last_education_level : last_education_level ? [last_education_level] : undefined;
    const qingKouArray = Array.isArray(is_qing_kou) ? is_qing_kou : is_qing_kou ? [is_qing_kou] : undefined;
    const genderArray = Array.isArray(gender) ? gender : gender ? [gender] : undefined;
    const bloodTypeArray = Array.isArray(blood_type) ? blood_type : blood_type ? [blood_type] : undefined;

    const users = await fetchAllUsers({ 
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
    });

    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", (req: Request, res: Response) => {
  void (async () => {
    try {
      const userId = parseInt(req.params.id);
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      res.status(200).json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })();
});

router.patch("/:id", (req: Request, res: Response) => {
  void (async () => {
    try {
      const userId = parseInt(req.params.id);
      const updatedUser = await updateUserById(userId, req.body);

      if (!updatedUser) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      res.status(200).json({
        message: "User berhasil diperbarui",
        data: updatedUser,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })();
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const deletedUser = await deleteUserById(userId);

    res.status(200).json({
      message: "User berhasil dihapus",
      deletedUser,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
