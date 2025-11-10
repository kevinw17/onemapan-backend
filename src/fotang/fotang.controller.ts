import { Router, Request, Response } from "express";
import {
    getAllFotang,
    findFotangById,
    createFotang,
    updateFotang,
    deleteFotang,
} from "../fotang/fotang.service";
import { Prisma } from "@prisma/client";
import { fetchCities, fetchDistricts, fetchLocalities, fetchProvinces } from "../profile/location/location.service";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const fotangs = await getAllFotang();
        res.status(200).json(fotangs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/provinces", async (_req: Request, res: Response) => {
    try {
        const provinces = await fetchProvinces();
        res.json(provinces);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/cities", (req, res) => {
    void (async () => {
        const provinceId = parseInt(req.query.provinceId as string);

        try {
        const cities = await fetchCities(provinceId);
        res.json(cities);
        } catch (error: any) {
        res.status(500).json({ message: error.message });
        }
    })();
});

router.get("/districts", (req, res) => {
    void (async () => {
        const cityId = parseInt(req.query.cityId as string);

        try {
        const districts = await fetchDistricts(cityId);
        res.json(districts);
        } catch (error: any) {
        res.status(500).json({ message: error.message });
        }
    })();
});

router.get("/localities", (req, res) => {
    void (async () => {
        const districtId = parseInt(req.query.districtId as string);

        try {
        const localities = await fetchLocalities(districtId);
        res.json(localities);
        } catch (error: any) {
        res.status(500).json({ message: error.message });
        }
    })();
});

router.get("/:id", async (req, res) => {
    void (async () => {
        try {
            const id = parseInt(req.params.id);
            const fotang = await findFotangById(id);
    
            if (!fotang) {
            return res.status(404).json({ message: "Fotang tidak ditemukan" });
            }
    
            res.status(200).json(fotang);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    })();
});

router.post("/", async (req: Request, res: Response) => {
    console.log("Payload diterima:", req.body); // DEBUG: LIHAT APA YANG KIRIM FRONTEND

    try {
        const newFotang = await createFotang(req.body as Prisma.FotangCreateInput);
        res.status(201).json(newFotang);
    } catch (error: any) {
        console.error("Error create:", error); // DEBUG
        res.status(400).json({ message: error.message });
    }
});

router.patch("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updatedFotang = await updateFotang(id, req.body as Prisma.FotangUpdateInput);

        res.status(200).json({
        message: "Fotang berhasil diperbarui",
        data: updatedFotang,
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        await deleteFotang(id);
        res.status(200).json({ message: "Fotang berhasil dihapus" });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
