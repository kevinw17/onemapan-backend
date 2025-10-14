import { Router, Request, Response } from "express";
import {
    getEvents,
    getEvent,
    createNewEvent,
    updateExistingEvent,
    removeEvent,
    getFilteredEvents,
} from "./event.service";
import { EventType, Korwil } from "@prisma/client";
import { ExtendedJwtPayload, authenticateJWT } from "../middleware/authentication";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

interface AuthRequest extends Request {
    user?: ExtendedJwtPayload;
}

const router = Router();

const uploadPath = path.join(__dirname, "../../public/uploads");

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

router.post("/upload", authenticateJWT, upload.single("file"), async (req: AuthRequest, res: Response) => {
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

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        console.log("DEBUG: GET /events, user:", { role: req.user!.role, area: req.user!.area });
        const events = await getEvents();
        let filteredEvents = events;

        // Restrict non-Super Admin users to their own area or national events
        if (req.user!.role !== "Super Admin") {
            const userArea = req.user!.area;
            if (userArea) {
                console.log(`DEBUG: Filtering events for ${req.user!.role} with area: ${userArea}`);
                filteredEvents = events.filter(event => event.area === userArea || event.area === null);
            } else {
                console.warn(`Non-Super Admin (role: ${req.user!.role}) has no area defined, showing only national events`);
                filteredEvents = events.filter(event => event.area === null);
            }
        } else {
            console.log("DEBUG: Super Admin, returning all events");
        }

        console.log("DEBUG: All Events:", filteredEvents.map(event => ({
            event_id: event.event_id,
            event_name: event.event_name,
            area: event.area,
        })));
        res.status(200).json(filteredEvents);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        console.error("DEBUG: Error in GET /events:", error.message);
        res.status(statusCode).json({ message: error.message });
    }
});

router.get("/filtered", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        console.log("DEBUG: GET /events/filtered, user:", { role: req.user!.role, area: req.user!.area }, "query:", req.query);
        const { event_type, provinceId, area, startDate, endDate } = req.query;

        const validEventTypes = [
            "Regular",
            "Hari_Besar",
            "AdHoc",
            "Anniversary",
            "Peresmian",
            "Seasonal",
        ];
        const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];

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

        let areaParam: Korwil | Korwil[] | null | undefined = undefined;
        if (req.user!.role !== "Super Admin") {
            const userArea = req.user!.area;
            if (userArea) {
                console.log(`DEBUG: Filtering for ${req.user!.role} with area: ${userArea}`);
                areaParam = userArea as Korwil;
                if (area && area !== userArea && area !== "nasional" && area !== "null") {
                    console.warn(`Non-Super Admin (role: ${req.user!.role}, area: ${userArea}) attempted to filter events with unauthorized area: ${area}`);
                    areaParam = userArea as Korwil; // Ignore requested area
                }
            } else {
                console.warn(`Non-Super Admin (role: ${req.user!.role}) has no area defined, filtering by national events`);
                areaParam = null;
            }
        } else {
            console.log("DEBUG: Super Admin, processing area filter from query");
            if (area !== undefined) {
                if (typeof area === "string" && (area === "null" || area === "" || area === "nasional")) {
                    areaParam = null;
                } else if (typeof area === "string") {
                    const areas = area.split(",").filter(a => validAreas.includes(a)) as Korwil[];
                    if (areas.length === 0) {
                        throw new Error("area tidak valid");
                    }
                    areaParam = areas;
                } else if (Array.isArray(area)) {
                    const areas = area
                        .filter(a => typeof a === "string" && validAreas.includes(a))
                        .map(a => a as Korwil);
                    if (areas.length === 0) {
                        throw new Error("area tidak valid");
                    }
                    areaParam = areas;
                } else {
                    throw new Error("Format area tidak valid");
                }
            }
        }

        console.log("DEBUG: Final Filter Params:", { event_type: eventTypeParam, provinceId: provinceIdParam, area: areaParam, startDate, endDate });

        const events = await getFilteredEvents({
            event_type: eventTypeParam,
            provinceId: provinceIdParam,
            area: areaParam,
            startDate: startDate ? startDate.toString() : undefined,
            endDate: endDate ? endDate.toString() : undefined,
        });

        console.log("DEBUG: Filtered Events:", events.map(event => ({
            event_id: event.event_id,
            event_name: event.event_name,
            area: event.area,
        })));

        res.status(200).json(events);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        console.error("DEBUG: Error in GET /events/filtered:", error.message);
        res.status(statusCode).json({ message: error.message });
    }
});

router.get("/:eventId", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        console.log("DEBUG: GET /events/:eventId, user:", { role: req.user!.role, area: req.user!.area }, "eventId:", req.params.eventId);
        const event = await getEvent(parseInt(req.params.eventId));
        if (!event) {
            res.status(404).json({ message: "Event tidak ditemukan" });
            return;
        }
        // Restrict non-Super Admin users (User and Admin) to their own area or national events
        if (req.user!.role !== "Super Admin") {
            const userArea = req.user!.area;
            if (userArea) {
                if (event.area !== null && event.area !== userArea) {
                    console.warn(`Non-Super Admin (role: ${req.user!.role}, area: ${userArea}) attempted to access event ${event.event_id} with unauthorized area: ${event.area}`);
                    res.status(403).json({ message: "Akses ditolak: Event tidak berada di wilayah Anda" });
                    return;
                }
            } else {
                if (event.area !== null) {
                    console.warn(`Non-Super Admin (role: ${req.user!.role}, area: null) attempted to access event ${event.event_id} with non-national area: ${event.area}`);
                    res.status(403).json({ message: "Akses ditolak: Anda hanya dapat melihat event nasional" });
                    return;
                }
            }
        }
        console.log("DEBUG: Returning event:", { event_id: event.event_id, event_name: event.event_name, area: event.area });
        res.status(200).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        console.error("DEBUG: Error in GET /events/:eventId:", error.message);
        res.status(statusCode).json({ message: error.message });
    }
});

router.post("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        console.log("DEBUG: POST /events, user:", { role: req.user!.role, area: req.user!.area }, "body:", req.body);
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
        if (req.body.area !== null && req.body.area !== undefined) {
            const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
            if (!validAreas.includes(req.body.area)) {
                const error = new Error("Area tidak valid. Harus salah satu dari: " + validAreas.join(", ") + " atau null untuk Nasional");
                (error as any).statusCode = 400;
                throw error;
            }
            if (req.user!.role !== "Super Admin" && req.body.area !== req.user!.area && req.body.area !== null) {
                console.warn(`Non-Super Admin (role: ${req.user!.role}, area: ${req.user!.area}) attempted to create event with unauthorized area: ${req.body.area}`);
                const error = new Error("Akses ditolak: Anda hanya dapat membuat event untuk wilayah Anda atau nasional");
                (error as any).statusCode = 403;
                throw error;
            }
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
            area: req.body.area,
            occurrences: req.body.occurrences.map((occ: any) => ({
                greg_occur_date: new Date(occ.greg_occur_date),
                greg_end_date: occ.greg_end_date ? new Date(occ.greg_end_date) : null,
            })),
        });
        console.log("DEBUG: Created event:", { event_id: event.event_id, event_name: event.event_name, area: event.area });
        res.status(201).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        console.error("DEBUG: Error in POST /events:", error.message);
        res.status(statusCode).json({ message: error.message });
    }
});

router.patch("/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        console.log("DEBUG: PATCH /events/:id, user:", { role: req.user!.role, area: req.user!.area }, "id:", req.params.id, "body:", req.body);
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
        if (req.body.area !== undefined) {
            const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
            if (req.body.area !== null && !validAreas.includes(req.body.area)) {
                const error = new Error("Area tidak valid. Harus salah satu dari: " + validAreas.join(", ") + " atau null untuk Nasional");
                (error as any).statusCode = 400;
                throw error;
            }
            if (req.user!.role !== "Super Admin" && req.body.area !== req.user!.area && req.body.area !== null) {
                console.warn(`Non-Super Admin (role: ${req.user!.role}, area: ${req.user!.area}) attempted to update event ${req.params.id} with unauthorized area: ${req.body.area}`);
                const error = new Error("Akses ditolak: Anda hanya dapat mengupdate event untuk wilayah Anda atau nasional");
                (error as any).statusCode = 403;
                throw error;
            }
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
            area: req.body.area,
            occurrences: req.body.occurrences ? req.body.occurrences.map((occ: any) => ({
                greg_occur_date: new Date(occ.greg_occur_date),
                greg_end_date: occ.greg_end_date ? new Date(occ.greg_end_date) : null,
            })) : undefined,
        });
        console.log("DEBUG: Updated event:", { event_id: event.event_id, event_name: event.event_name, area: event.area });
        res.status(200).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        console.error("DEBUG: Error in PATCH /events/:id:", error.message);
        res.status(statusCode).json({ message: error.message });
    }
});

router.delete("/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        console.log("DEBUG: DELETE /events/:id, user:", { role: req.user!.role, area: req.user!.area }, "id:", req.params.id);
        const event = await getEvent(parseInt(req.params.id));
        if (!event) {
            res.status(404).json({ message: "Event tidak ditemukan" });
            return;
        }
        if (req.user!.role !== "Super Admin" && event.area !== null && event.area !== req.user!.area) {
            console.warn(`Non-Super Admin (role: ${req.user!.role}, area: ${req.user!.area}) attempted to delete event ${req.params.id} with unauthorized area: ${event.area}`);
            res.status(403).json({ message: "Akses ditolak: Anda hanya dapat menghapus event untuk wilayah Anda atau nasional" });
            return;
        }
        await removeEvent(parseInt(req.params.id));
        console.log("DEBUG: Deleted event:", { event_id: event.event_id, event_name: event.event_name, area: event.area });
        res.status(200).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        console.error("DEBUG: Error in DELETE /events/:id:", error.message);
        res.status(statusCode).json({ message: error.message });
    }
});

export default router;