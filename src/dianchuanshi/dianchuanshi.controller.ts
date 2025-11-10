// src/dianchuanshi/dianchuanshi.controller.ts
import { Router, Request, Response } from "express";
import {
    getAllDianChuanShiService,
    getDianChuanShiByIdService,
    createDianChuanShiService,
    updateDianChuanShiService,
    deleteDianChuanShiService,
} from "./dianchuanshi.service";
import { Prisma } from "@prisma/client";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const data = await getAllDianChuanShiService();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const data = await getDianChuanShiByIdService(id);
        res.json(data);
    } catch (error: any) {
        res.status(404).json({ message: error.message });
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const newPandita = await createDianChuanShiService(req.body as Prisma.DianChuanShiCreateInput);
        res.status(201).json({ message: "Pandita berhasil ditambahkan", data: newPandita });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.patch("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updated = await updateDianChuanShiService(id, req.body as Prisma.DianChuanShiUpdateInput);
        res.json({ message: "Pandita berhasil diperbarui", data: updated });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const result = await deleteDianChuanShiService(id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;