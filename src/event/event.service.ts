// src/features/event/event.service.ts
import { Event, EventType, Korwil, EventCategory } from "@prisma/client";
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsFiltered,
  type EventWithRelations,
  type CreateEventInput,
  type UpdateEventInput,
} from "./event.repository";

interface FilterEventsInput {
  event_type?: EventType | EventType[];
  area?: Korwil | Korwil[];
  is_recurring?: boolean;
  startDate?: string;
  endDate?: string;
  category?: EventCategory | EventCategory[];
  province_id?: string | string[];
  city_id?: string | string[];
  institution_id?: string | string[];
}

export const getEvents = async (): Promise<EventWithRelations[]> => {
  return await getAllEvents();
};

export const getFilteredEvents = async (input: FilterEventsInput): Promise<EventWithRelations[]> => {
  const { event_type, area, is_recurring, startDate, endDate, category, province_id, city_id, institution_id } = input;

  // VALIDASI EventType SESUAI PRISMA
  const validEventTypes = [
    "Anniversary",
    "Hari_Besar",
    "Peresmian",
    "Regular",
    "Lembaga",
    "Seasonal"
  ];

  if (event_type) {
    const types = Array.isArray(event_type) ? event_type : [event_type];
    if (!types.every(t => validEventTypes.includes(t))) {
      const err = new Error("Invalid event_type. Must be one of: " + validEventTypes.join(", "));
      (err as any).statusCode = 400;
      throw err;
    }
  }

  // Validasi area
  const validAreas = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
  if (area !== undefined) {
    const areas = Array.isArray(area) ? area : [area];
    if (!areas.every(a => validAreas.includes(a))) {
      const err = new Error("Invalid area. Must be one of: " + validAreas.join(", "));
      (err as any).statusCode = 400;
      throw err;
    }
  }

  return await getEventsFiltered({
    event_type,
    area,
    is_recurring,
    startDate,
    endDate,
    category,
    province_id,
    city_id,
    institution_id,
  });
};

export const getEvent = async (eventId: number): Promise<EventWithRelations> => {
  const event = await getEventById(eventId);
  if (!event) throw { message: "Event tidak ditemukan", statusCode: 404 };
  return event;
};

export const createNewEvent = async (input: CreateEventInput): Promise<EventWithRelations> => {
  if (!input.event_name) throw { message: "event_name required", statusCode: 400 };
  if (input.occurrences.length === 0) throw { message: "At least one occurrence required", statusCode: 400 };
  if (input.is_in_fotang && !input.fotangId) throw { message: "fotangId required", statusCode: 400 };
  if (!input.is_in_fotang && (!input.cityId || !input.location_name || !input.area)) {
    throw { message: "cityId, location_name, area required for manual location", statusCode: 400 };
  }

  return await createEvent(input);
};

export const updateExistingEvent = async (eventId: number, input: UpdateEventInput): Promise<EventWithRelations> => {
  const event = await getEventById(eventId);
  if (!event) throw { message: "Event tidak ditemukan", statusCode: 404 };

  if (input.is_in_fotang === false && input.cityId && input.location_name && !input.area) {
    throw { message: "area required for manual location", statusCode: 400 };
  }

  return await updateEvent(eventId, input);
};

export const removeEvent = async (eventId: number): Promise<Event> => {
  const event = await getEventById(eventId);
  if (!event) throw { message: "Event tidak ditemukan", statusCode: 404 };
  return await deleteEvent(eventId);
};