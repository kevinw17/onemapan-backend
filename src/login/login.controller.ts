import { Router, Request, Response, NextFunction } from "express";
import { loginUser } from "./login.service";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  void (async () => {
    try {
      const result = await loginUser(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ message: error.message });
    }
  })();
});

export default router;
