import { Event, Occurrence, EventType, Location, Korwil } from "@prisma/client";
import {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    createOccurrence,
    getEventsFiltered,
} from "./event.repository";

type EventWithRelations = Event & {
    location: Location;
    occurrences: Occurrence[];
};

interface CreateEventInput {
    event_type: EventType;
    event_name: string;
    event_mandarin_name: string | null;
    locationData: {
        location_name: string;
        location_mandarin_name: string | null;
        localityId: number;
        provinceId: number;
        cityId: number;
        districtId: number;
        street: string | null;
        postal_code: string | null;
        country_iso: string;
        latitude: number | null;
        longitude: number | null;
    };
    lunar_sui_ci_year: string;
    lunar_month: string;
    lunar_day: string;
    is_recurring: boolean;
    description: string | null;
    poster_s3_bucket_link: string | null;
    occurrences: { greg_occur_date: Date; greg_end_date?: Date | null }[];
    area: Korwil | null;
}

interface UpdateEventInput {
    event_type?: EventType;
    event_name?: string;
    event_mandarin_name?: string | null;
    locationId?: number;
    locationData?: {
        location_name?: string;
        location_mandarin_name?: string | null;
        localityId?: number;
        provinceId?: number;
        cityId?: number;
        districtId?: number;
        street?: string | null;
        postal_code?: string | null;
        country_iso?: string;
        latitude?: number | null;
        longitude?: number | null;
    };
    lunar_sui_ci_year?: string;
    lunar_month?: string;
    lunar_day?: string;
    is_recurring?: boolean;
    description?: string | null;
    poster_s3_bucket_link?: string | null;
    occurrences?: { greg_occur_date: Date; greg_end_date?: Date | null }[];
    area?: Korwil | null;
}

interface FilterEventsInput {
    event_type?: EventType | EventType[];
    area?: Korwil | Korwil[] | null;
    is_recurring?: boolean | boolean[];
    startDate?: string;
    endDate?: string;
}

export const getEvents = async (): Promise<EventWithRelations[]> => {
    return await getAllEvents();
};

export const getFilteredEvents = async (input: FilterEventsInput): Promise<EventWithRelations[]> => {
    const { event_type, area, is_recurring, startDate, endDate } = input;

    const validEventTypes = [
        "Regular",
        "Hari_Besar",
        "AdHoc",
        "Anniversary",
        "Peresmian",
        "Seasonal",
    ];
    if (event_type) {
        if (Array.isArray(event_type)) {
            if (!event_type.every(type => validEventTypes.includes(type))) {
                const error = new Error("Invalid event_type provided");
                (error as any).statusCode = 400;
                throw error;
            }
        } else if (!validEventTypes.includes(event_type)) {
            const error = new Error("Invalid event_type provided");
            (error as any).statusCode = 400;
            throw error;
        }
    }

    if (area !== undefined && area !== null) {
        const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
        if (Array.isArray(area)) {
            if (!area.every(a => validAreas.includes(a))) {
                const error = new Error("Invalid area provided");
                (error as any).statusCode = 400;
                throw error;
            }
        } else if (!validAreas.includes(area)) {
            const error = new Error("Invalid area provided");
            (error as any).statusCode = 400;
            throw error;
        }
    }

    if (is_recurring !== undefined) {
        if (Array.isArray(is_recurring)) {
            if (!is_recurring.every(val => typeof val === "boolean")) {
                const error = new Error("Invalid is_recurring provided");
                (error as any).statusCode = 400;
                throw error;
            }
        } else if (typeof is_recurring !== "boolean") {
            const error = new Error("Invalid is_recurring provided");
            (error as any).statusCode = 400;
            throw error;
        }
    }

    return await getEventsFiltered({
        event_type,
        area,
        is_recurring,
        startDate,
        endDate,
    });
};

export const getEvent = async (eventId: number): Promise<EventWithRelations> => {
    const event = await getEventById(eventId);
    if (!event) {
        const error = new Error("Event tidak ditemukan");
        (error as any).statusCode = 404;
        throw error;
    }
    return event;
};

export const createNewEvent = async (input: CreateEventInput): Promise<EventWithRelations> => {
    if (!input.event_name || !input.locationData?.location_name || !input.locationData?.localityId) {
        const error = new Error("Nama event, nama lokasi, dan localityId wajib diisi");
        (error as any).statusCode = 400;
        throw error;
    }
    if (!input.occurrences || input.occurrences.length === 0) {
        const error = new Error("Setidaknya satu occurrence wajib diisi");
        (error as any).statusCode = 400;
        throw error;
    }
    if (!input.locationData.provinceId || !input.locationData.cityId || !input.locationData.districtId) {
        const error = new Error("ProvinceId, cityId, dan districtId wajib diisi");
        (error as any).statusCode = 400;
        throw error;
    }
    if (input.area !== null) {
        const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
        if (!validAreas.includes(input.area)) {
            const error = new Error("Area tidak valid. Harus salah satu dari: " + validAreas.join(", ") + " atau null untuk Nasional");
            (error as any).statusCode = 400;
            throw error;
        }
    }
    // Validate greg_end_date is after greg_occur_date
    for (const occ of input.occurrences) {
        if (occ.greg_end_date && occ.greg_end_date <= occ.greg_occur_date) {
            const error = new Error("greg_end_date must be after greg_occur_date for each occurrence");
            (error as any).statusCode = 400;
            throw error;
        }
    }

    return await createEvent({
        event_type: input.event_type,
        event_name: input.event_name,
        event_mandarin_name: input.event_mandarin_name,
        locationData: {
            location_name: input.locationData.location_name,
            location_mandarin_name: input.locationData.location_mandarin_name,
            localityId: input.locationData.localityId,
            provinceId: input.locationData.provinceId,
            cityId: input.locationData.cityId,
            districtId: input.locationData.districtId,
            street: input.locationData.street,
            postal_code: input.locationData.postal_code,
            country_iso: input.locationData.country_iso || "IDN",
            latitude: input.locationData.latitude,
            longitude: input.locationData.longitude,
        },
        lunar_sui_ci_year: input.lunar_sui_ci_year,
        lunar_month: input.lunar_month,
        lunar_day: input.lunar_day,
        is_recurring: input.is_recurring,
        description: input.description,
        poster_s3_bucket_link: input.poster_s3_bucket_link,
        occurrences: input.occurrences,
        area: input.area,
    });
};

export const updateExistingEvent = async (eventId: number, input: UpdateEventInput): Promise<EventWithRelations> => {
    const event = await getEventById(eventId);
    if (!event) {
        const error = new Error("Event tidak ditemukan");
        (error as any).statusCode = 404;
        throw error;
    }
    if (input.locationData && (!input.locationData.provinceId || !input.locationData.cityId || !input.locationData.districtId || !input.locationData.localityId)) {
        const error = new Error("ProvinceId, cityId, districtId, dan localityId wajib diisi jika locationData disediakan");
        (error as any).statusCode = 400;
        throw error;
    }
    if (input.area !== undefined) {
        const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
        if (input.area !== null && !validAreas.includes(input.area)) {
            const error = new Error("Area tidak valid. Harus salah satu dari: " + validAreas.join(", ") + " atau null untuk Nasional");
            (error as any).statusCode = 400;
            throw error;
        }
    }
    // Validate greg_end_date is after greg_occur_date
    if (input.occurrences) {
        for (const occ of input.occurrences) {
            if (occ.greg_end_date && occ.greg_end_date <= occ.greg_occur_date) {
                const error = new Error("greg_end_date must be after greg_occur_date for each occurrence");
                (error as any).statusCode = 400;
                throw error;
            }
        }
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