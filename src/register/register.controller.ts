import { Router, Request, Response } from "express";
import { registerCredential } from "./register.service";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    await registerCredential(username, password);

    res.status(201).send("Username berhasil dibuat");
  } catch (error: any) {
    res.status(400).send(error.message || "Terjadi kesalahan saat registrasi");
  }
});

export default router;
