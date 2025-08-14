import { Router, Request, Response, NextFunction } from "express";
import {
    getEvents,
    getEvent,
    createNewEvent,
    updateExistingEvent,
    removeEvent,
} from "./event.service";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    try {
        const events = await getEvents();
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
        const event = await createNewEvent(req.body);
        res.status(201).json(event);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.patch("/:id", async (req: Request, res: Response) => {
    try {
        const event = await updateExistingEvent(parseInt(req.params.id), req.body);
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