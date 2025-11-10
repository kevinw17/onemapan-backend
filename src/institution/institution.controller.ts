import { Router, Request, Response } from "express";
import {
    getAllInstitutions,
    createInstitution,
    updateInstitution,
    deleteInstitution,
} from "./institution.service";
import { Prisma } from "@prisma/client";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const data = await getAllInstitutions();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const newInst = await createInstitution(req.body as Prisma.InstitutionCreateInput);
        res.status(201).json(newInst);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.patch("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updated = await updateInstitution(id, req.body as Prisma.InstitutionUpdateInput);
        res.json({ message: "Lembaga berhasil diperbarui", data: updated });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        await deleteInstitution(id);
        res.json({ message: "Lembaga berhasil dihapus" });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;