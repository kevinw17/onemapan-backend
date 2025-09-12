import { Router, Request, Response } from "express";
import {
    getEvents,
    getEvent,
    createNewEvent,
    updateExistingEvent,
    removeEvent,
    getFilteredEvents,
} from "./event.service";
import { EventType } from "@prisma/client";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const router = Router();

const uploadPath = path.join(__dirname, "../../public/uploads"); // Changed to public/uploads

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            fs.accessSync(uploadPath, fs.constants.W_OK);
            cb(null, uploadPath);
        } catch (err) {
            console.error("Directory access error:", err);
        }
    },
    filename: (req, file, cb) => {
        const extension = file.mimetype === "image/jpeg" ? "jpg" : "png";
        const filename = `${uuidv4()}.${extension}`;
        cb(null, filename);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png"];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Hanya file JPG dan PNG yang diperbolehkan"));
        }
        cb(null, true);
    },
});

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            const error = new Error("Tidak ada file yang diunggah");
            (error as any).statusCode = 400;
            throw error;
        }
        const { filename, path: filePath, size } = req.file;
        try {
            const buffer = fs.readFileSync(filePath);
        } catch (err) {
            console.error("Error reading saved file:", err);
        }
        const baseUrl = process.env.SERVER_BASE_URL;
        if (!baseUrl) {
            const error = new Error("Server configuration error");
            (error as any).statusCode = 500;
            throw error;
        }
        const url = `${baseUrl}/uploads/${filename}`;
        res.status(200).json({ url });
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.get("/", async (req: Request, res: Response) => {
    try {
        const events = await getEvents();
        res.status(200).json(events);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.get("/filtered", async (req: Request, res: Response) => {
    try {
        const { event_type, provinceId } = req.query;

        const validEventTypes = [
            "Regular",
            "Hari_Besar",
            "AdHoc",
            "Anniversary",
            "Peresmian",
            "Seasonal",
        ];

        let eventTypeParam: EventType | EventType[] | undefined;
        if (event_type) {
            if (typeof event_type === "string") {
                const eventTypes = event_type.split(",").filter(type => validEventTypes.includes(type));
                if (eventTypes.length === 0) {
                    throw new Error("event_type tidak valid");
                }
                eventTypeParam = eventTypes.length === 1 ? eventTypes[0] as EventType : eventTypes as EventType[];
            } else if (Array.isArray(event_type)) {
                const eventTypes = event_type
                    .filter(type => typeof type === "string" && validEventTypes.includes(type))
                    .map(type => type as EventType);
                if (eventTypes.length === 0) {
                    throw new Error("event_type tidak valid");
                }
                eventTypeParam = eventTypes;
            } else {
                throw new Error("Format event_type tidak valid");
            }
        }

        let provinceIdParam: number | number[] | undefined;
        if (provinceId) {
            if (typeof provinceId === "string") {
                const ids = provinceId
                    .split(",")
                    .map(id => parseInt(id))
                    .filter(id => !isNaN(id) && id > 0);
                provinceIdParam = ids.length === 1 ? ids[0] : ids;
            } else if (Array.isArray(provinceId)) {
                const ids = provinceId
                    .map(id => parseInt(id.toString()))
                    .filter(id => !isNaN(id) && id > 0);
                if (ids.length === 0) {
                    throw new Error("provinceId tidak valid");
                }
                provinceIdParam = ids;
            } else {
                const id = parseInt(provinceId.toString());
                if (!isNaN(id) && id > 0) {
                    provinceIdParam = id;
                } else {
                    throw new Error("provinceId tidak valid");
                }
            }
        }

        const events = await getFilteredEvents({
            event_type: eventTypeParam,
            provinceId: provinceIdParam,
        });

        res.status(200).json(events);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.get("/:eventId", async (req: Request, res: Response) => {
    try {
        const event = await getEvent(parseInt(req.params.eventId));
        if (!event) {
            res.status(404).json({ message: "Event tidak ditemukan" });
            return;
        }
        res.status(200).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        if (!req.body.localityId || isNaN(parseInt(req.body.localityId))) {
            const error = new Error("localityId wajib diisi dan harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (!req.body.provinceId || isNaN(parseInt(req.body.provinceId))) {
            const error = new Error("provinceId wajib diisi dan harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (!req.body.cityId || isNaN(parseInt(req.body.cityId))) {
            const error = new Error("cityId wajib diisi dan harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (!req.body.districtId || isNaN(parseInt(req.body.districtId))) {
            const error = new Error("districtId wajib diisi dan harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (!req.body.occurrences || !Array.isArray(req.body.occurrences) || req.body.occurrences.length === 0) {
            const error = new Error("Setidaknya satu occurrence wajib diisi");
            (error as any).statusCode = 400;
            throw error;
        }
        for (const occ of req.body.occurrences) {
            if (occ.greg_end_date && new Date(occ.greg_end_date) <= new Date(occ.greg_occur_date)) {
                const error = new Error("greg_end_date harus setelah greg_occur_date untuk setiap occurrence");
                (error as any).statusCode = 400;
                throw error;
            }
        }

        const event = await createNewEvent({
            event_type: req.body.event_type,
            event_name: req.body.event_name,
            event_mandarin_name: req.body.event_mandarin_name || null,
            locationData: {
                location_name: req.body.location_name,
                location_mandarin_name: req.body.location_mandarin_name || null,
                localityId: parseInt(req.body.localityId),
                provinceId: parseInt(req.body.provinceId),
                cityId: parseInt(req.body.cityId),
                districtId: parseInt(req.body.districtId),
                street: req.body.street || null,
                postal_code: req.body.postal_code || null,
                country_iso: req.body.country_iso || "IDN",
                latitude: req.body.latitude ? Number(req.body.latitude) : null,
                longitude: req.body.longitude ? Number(req.body.longitude) : null,
            },
            lunar_sui_ci_year: req.body.lunar_sui_ci_year,
            lunar_month: req.body.lunar_month,
            lunar_day: req.body.lunar_day,
            is_recurring: req.body.is_recurring || false,
            description: req.body.description || null,
            poster_s3_bucket_link: req.body.poster_s3_bucket_link || null,
            occurrences: req.body.occurrences.map((occ: any) => ({
                greg_occur_date: new Date(occ.greg_occur_date),
                greg_end_date: occ.greg_end_date ? new Date(occ.greg_end_date) : null,
            })),
        });
        res.status(201).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.patch("/:id", async (req: Request, res: Response) => {
    try {
        if (req.body.localityId && isNaN(parseInt(req.body.localityId))) {
            const error = new Error("localityId harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (req.body.provinceId && isNaN(parseInt(req.body.provinceId))) {
            const error = new Error("provinceId harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (req.body.cityId && isNaN(parseInt(req.body.cityId))) {
            const error = new Error("cityId harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (req.body.districtId && isNaN(parseInt(req.body.districtId))) {
            const error = new Error("districtId harus berupa angka");
            (error as any).statusCode = 400;
            throw error;
        }
        if (req.body.occurrences && (!Array.isArray(req.body.occurrences) || req.body.occurrences.length === 0)) {
            const error = new Error("Setidaknya satu occurrence wajib diisi jika occurrences disediakan");
            (error as any).statusCode = 400;
            throw error;
        }
        if (req.body.occurrences) {
            for (const occ of req.body.occurrences) {
                if (occ.greg_end_date && new Date(occ.greg_end_date) <= new Date(occ.greg_occur_date)) {
                    const error = new Error("greg_end_date harus setelah greg_occur_date untuk setiap occurrence");
                    (error as any).statusCode = 400;
                    throw error;
                }
            }
        }

        const event = await updateExistingEvent(parseInt(req.params.id), {
            event_type: req.body.event_type,
            event_name: req.body.event_name,
            event_mandarin_name: req.body.event_mandarin_name || null,
            locationId: req.body.locationId ? parseInt(req.body.locationId) : undefined,
            locationData: req.body.location_name ? {
                location_name: req.body.location_name,
                location_mandarin_name: req.body.location_mandarin_name || null,
                localityId: req.body.localityId ? parseInt(req.body.localityId) : undefined,
                provinceId: req.body.provinceId ? parseInt(req.body.provinceId) : undefined,
                cityId: req.body.cityId ? parseInt(req.body.cityId) : undefined,
                districtId: req.body.districtId ? parseInt(req.body.districtId) : undefined,
                street: req.body.street || null,
                postal_code: req.body.postal_code || null,
                country_iso: req.body.country_iso || "IDN",
                latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
                longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
            } : undefined,
            lunar_sui_ci_year: req.body.lunar_sui_ci_year,
            lunar_month: req.body.lunar_month,
            lunar_day: req.body.lunar_day,
            is_recurring: req.body.is_recurring,
            description: req.body.description || null,
            poster_s3_bucket_link: req.body.poster_s3_bucket_link || null,
            occurrences: req.body.occurrences ? req.body.occurrences.map((occ: any) => ({
                greg_occur_date: new Date(occ.greg_occur_date),
                greg_end_date: occ.greg_end_date ? new Date(occ.greg_end_date) : null,
            })) : undefined,
        });
        res.status(200).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const event = await removeEvent(parseInt(req.params.id));
        res.status(200).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

export default router;