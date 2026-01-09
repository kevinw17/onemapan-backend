import { Router, Request, Response } from "express";
import {
  getEvents,
  getEvent,
  createNewEvent,
  updateExistingEvent,
  removeEvent,
  getFilteredEvents,
} from "./event.service";
import { EventType, Korwil, EventCategory } from "@prisma/client";
import { ExtendedJwtPayload, authenticateJWT } from "../middleware/authentication";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { isNationalAccessRole } from "../role/roleUtils";

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
      cb(err as Error, uploadPath);
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

router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const events = await getEvents();
    res.status(200).json(events);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.get("/filtered", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const {
      event_type,
      area,
      is_recurring,
      startDate,
      endDate,
      category,
      province_id,
      city_id,
      institution_id
    } = req.query;

    const validEventTypes = ["Anniversary", "Hari_Besar", "Peresmian", "Regular", "Lembaga", "Seasonal"];
    const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];

    let eventTypeParam: EventType | EventType[] | undefined;
    if (event_type) {
      const types = Array.isArray(event_type) ? event_type : (event_type as string).split(",");
      const valid = types.filter(t => validEventTypes.includes(t as any)) as EventType[];
      if (valid.length === 0) throw { message: "event_type tidak valid", statusCode: 400 };
      eventTypeParam = valid.length === 1 ? valid[0] : valid;
    }

    let areaParam: Korwil | Korwil[] | undefined;
    if (area) {
      const areas = Array.isArray(area) ? area : (area as string).split(",");
      const valid = areas.filter(a => validAreas.includes(a as any)) as Korwil[];
      if (valid.length === 0) throw { message: "area tidak valid", statusCode: 400 };
      areaParam = valid.length === 1 ? valid[0] : valid;
    }

    let isRecurringParam: boolean | undefined;
    if (is_recurring !== undefined) {
      const val = is_recurring.toString().toLowerCase();
      if (val === "true") isRecurringParam = true;
      else if (val === "false") isRecurringParam = false;
      else throw { message: "is_recurring harus true atau false", statusCode: 400 };
    }

    const events = await getFilteredEvents({
      event_type: eventTypeParam,
      area: areaParam,
      is_recurring: isRecurringParam,
      startDate: startDate?.toString(),
      endDate: endDate?.toString(),
      category: category
        ? (Array.isArray(category) ? category : [category]).map(c => c as EventCategory)
        : undefined,
      province_id: province_id
        ? Array.isArray(province_id)
          ? province_id.map(String)
          : province_id.toString().split(",")
        : undefined,
      city_id: city_id
        ? Array.isArray(city_id)
          ? city_id.map(String)
          : city_id.toString().split(",")
        : undefined,
      institution_id: institution_id
        ? Array.isArray(institution_id)
          ? institution_id.map(String)
          : institution_id.toString().split(",")
        : undefined,
    });

    res.status(200).json(events);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.get("/:eventId", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const event = await getEvent(parseInt(req.params.eventId));
    if (!event) {
      res.status(404).json({ message: "Event tidak ditemukan" });
      return;
    }

    res.status(200).json(event);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const {
      category,
      event_type,
      event_name,
      event_mandarin_name,
      is_in_fotang,
      fotangId,
      cityId,
      location_name,
      street,
      postal_code,
      area,
      institutionId,
      lunar_sui_ci_year,
      lunar_month,
      lunar_day,
      is_recurring,
      description,
      poster_s3_bucket_link,
      occurrences,
    } = req.body;

    if (!event_name) throw { message: "event_name required", statusCode: 400 };
    if (!occurrences || !Array.isArray(occurrences) || occurrences.length === 0)
      throw { message: "At least one occurrence required", statusCode: 400 };

    if (is_in_fotang && !fotangId) throw { message: "fotangId required", statusCode: 400 };
    if (!is_in_fotang && (!cityId || !location_name || !area))
      throw { message: "cityId, location_name, area required", statusCode: 400 };

    if (area) {
      const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
      if (!validAreas.includes(area))
        throw { message: "Area tidak valid", statusCode: 400 };

      if (!isNationalAccessRole(req.user?.role) && area !== req.user!.area)
        throw { message: "Tidak boleh buat event di luar wilayah Anda", statusCode: 403 };
    }

    const event = await createNewEvent({
      category,
      event_type,
      event_name,
      event_mandarin_name: event_mandarin_name ?? null,
      is_in_fotang: is_in_fotang ?? true,
      fotangId: fotangId ? parseInt(fotangId) : undefined,
      cityId: cityId ? parseInt(cityId) : undefined,
      location_name,
      street: street ?? null,
      postal_code: postal_code ?? null,
      area: area ? (area as Korwil) : undefined,
      institutionId: institutionId ? parseInt(institutionId) : undefined,
      lunar_sui_ci_year: lunar_sui_ci_year ?? null,
      lunar_month: lunar_month ?? null,
      lunar_day: lunar_day ?? null,
      is_recurring: is_recurring ?? false,
      description: description ?? null,
      poster_s3_bucket_link: poster_s3_bucket_link ?? null,
      occurrences: occurrences.map((o: any) => ({
        greg_occur_date: new Date(o.greg_occur_date),
        greg_end_date: o.greg_end_date ? new Date(o.greg_end_date) : null,
      })),
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.patch("/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await getEvent(eventId);
    if (!event) {
      res.status(404).json({ message: "Event tidak ditemukan" });
      return;
    }

    const {
      category,
      event_type,
      event_name,
      event_mandarin_name,
      is_in_fotang,
      fotangId,
      cityId,
      location_name,
      street,
      postal_code,
      area,
      institutionId,
      lunar_sui_ci_year,
      lunar_month,
      lunar_day,
      is_recurring,
      description,
      poster_s3_bucket_link,
      occurrences,
      eventLocationId,
    } = req.body;

    if (area !== undefined) {
      const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
      if (area !== null && !validAreas.includes(area))
        throw { message: "Area tidak valid", statusCode: 400 };

      if (!isNationalAccessRole(req.user?.role) && area !== null && area !== req.user!.area)
        throw { message: "Tidak boleh ubah ke wilayah lain", statusCode: 403 };
    }

    const updated = await updateExistingEvent(eventId, {
      category: category ? (category as EventCategory) : undefined,
      event_type: event_type ? (event_type as EventType) : undefined,
      event_name,
      event_mandarin_name: event_mandarin_name ?? undefined,
      is_in_fotang: is_in_fotang !== undefined ? is_in_fotang : undefined,
      fotangId: fotangId ? parseInt(fotangId) : undefined,
      cityId: cityId ? parseInt(cityId) : undefined,
      location_name,
      street: street ?? undefined,
      postal_code: postal_code ?? undefined,
      area: area !== undefined ? (area as Korwil) : undefined,
      institutionId: institutionId ? parseInt(institutionId) : undefined,
      lunar_sui_ci_year: lunar_sui_ci_year ?? undefined,
      lunar_month: lunar_month ?? undefined,
      lunar_day: lunar_day ?? undefined,
      is_recurring: is_recurring !== undefined ? is_recurring : undefined,
      description: description ?? undefined,
      poster_s3_bucket_link: poster_s3_bucket_link ?? undefined,
      occurrences: occurrences
        ? occurrences.map((o: any) => ({
            greg_occur_date: new Date(o.greg_occur_date),
            greg_end_date: o.greg_end_date ? new Date(o.greg_end_date) : null,
          }))
        : undefined,
      eventLocationId: eventLocationId ? parseInt(eventLocationId) : undefined,
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete("/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await getEvent(eventId);
    if (!event) {
      res.status(404).json({ message: "Event tidak ditemukan" });
      return;
    }

    const eventArea = event.fotang?.area ?? event.eventLocation?.area ?? null;
    if (!isNationalAccessRole(req.user?.role) && eventArea !== null && eventArea !== req.user!.area) {
      res.status(403).json({ message: "Tidak boleh hapus event di luar wilayah Anda" });
      return;
    }

    await removeEvent(eventId);
    res.status(200).json({ message: "Event dihapus" });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post(
  "/upload-poster",
  authenticateJWT,
  upload.single("poster"),
  (req: AuthRequest, res: Response): void => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "Tidak ada file yang diunggah" });
        return;
      }

      const baseUrl = process.env.SERVER_BASE_URL?.replace(/\/$/, "");
      if (!baseUrl) {
        res.status(500).json({ message: "SERVER_BASE_URL tidak diset" });
        return;
      }

      const url = `${baseUrl}/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error: any) {
      console.error("Upload poster error:", error);
      res.status(500).json({ message: error.message || "Gagal upload poster" });
    }
  }
);

export default router;