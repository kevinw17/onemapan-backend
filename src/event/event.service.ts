import { Event, Occurrence, EventType } from "@prisma/client";
import {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    createOccurrence,
} from "./event.repository";

interface CreateEventInput {
    event_type: EventType;
    event_name: string;
    event_mandarin_name: string | null;
    location_name: string;
    lunar_sui_ci_year: string;
    lunar_month: string;
    lunar_day: string;
    is_recurring: boolean;
    description: string | null;
    poster_s3_bucket_link: string | null;
    occurrences: { greg_occur_date: Date }[];
}

interface UpdateEventInput {
    event_type?: EventType;
    event_name?: string;
    event_mandarin_name?: string | null;
    location_name?: string;
    lunar_sui_ci_year?: string;
    lunar_month?: string;
    lunar_day?: string;
    is_recurring?: boolean;
    description?: string | null;
    poster_s3_bucket_link?: string | null;
}

export const getEvents = async (): Promise<Event[]> => {
    return await getAllEvents();
};

export const getEvent = async (eventId: number): Promise<Event> => {
    const event = await getEventById(eventId);
    if (!event) {
        const error = new Error("Event tidak ditemukan");
        (error as any).statusCode = 404;
        throw error;
    }
    return event;
};

export const createNewEvent = async (input: CreateEventInput): Promise<Event> => {
    if (!input.event_name || !input.location_name) {
        const error = new Error("Nama event dan lokasi wajib diisi");
        (error as any).statusCode = 400;
        throw error;
    }
    if (!input.occurrences || input.occurrences.length === 0) {
        const error = new Error("Setidaknya satu occurrence wajib diisi");
        (error as any).statusCode = 400;
        throw error;
    }
    const event = await createEvent({
        event_type: input.event_type,
        event_name: input.event_name,
        event_mandarin_name: input.event_mandarin_name,
        location_name: input.location_name,
        lunar_sui_ci_year: input.lunar_sui_ci_year,
        lunar_month: input.lunar_month,
        lunar_day: input.lunar_day,
        is_recurring: input.is_recurring,
        description: input.description,
        poster_s3_bucket_link: input.poster_s3_bucket_link,
    });
    await Promise.all(input.occurrences.map((occ) =>
        createOccurrence(event.event_id, { greg_occur_date: occ.greg_occur_date, event_id: event.event_id })
    ));
    const refreshedEvent = await getEventById(event.event_id);
    if (!refreshedEvent) {
        const error = new Error("Gagal mengambil event setelah pembuatan");
        (error as any).statusCode = 500;
        throw error;
    }
    return refreshedEvent;
};

export const updateExistingEvent = async (eventId: number, input: UpdateEventInput): Promise<Event> => {
    const event = await getEventById(eventId);
    if (!event) {
        const error = new Error("Event tidak ditemukan");
        (error as any).statusCode = 404;
        throw error;
    }
    return await updateEvent(eventId, input);
};

export const removeEvent = async (eventId: number): Promise<Event> => {
    const event = await getEventById(eventId);
    if (!event) {
        const error = new Error("Event tidak ditemukan");
        (error as any).statusCode = 404;
        throw error;
    }
    return await deleteEvent(eventId);
};