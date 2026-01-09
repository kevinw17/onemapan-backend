import { Event, Occurrence, Fotang, EventLocation, Institution, Prisma, EventType, Korwil, EventCategory } from "@prisma/client";
import prisma from "../db";

export type EventWithRelations = Event & {
  fotang?: Fotang | null;
  eventLocation?: (EventLocation & { city: { province: { name: string } } }) | null;
  institution?: Institution | null;
  occurrences: Occurrence[];
};

export type CreateEventInput = {
  category: EventCategory;
  event_type: EventType;
  event_name: string;
  event_mandarin_name?: string | null;
  is_in_fotang: boolean;
  fotangId?: number;
  cityId?: number;
  location_name?: string;
  street?: string | null;
  postal_code?: string | null;
  area?: Korwil;
  institutionId?: number;
  lunar_sui_ci_year?: string | null;
  lunar_month?: string | null;
  lunar_day?: string | null;
  is_recurring: boolean;
  description?: string | null;
  poster_s3_bucket_link?: string | null;
  occurrences: { greg_occur_date: Date; greg_end_date?: Date | null }[];
};

export type UpdateEventInput = Partial<CreateEventInput> & {
  eventLocationId?: number;
};

interface FilteredEventsOptions {
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

export const getAllEvents = async (): Promise<EventWithRelations[]> => {
  return await prisma.event.findMany({
    include: {
      fotang: true,
      eventLocation: {
        include: {
          city: { include: { province: { select: { name: true } } } },
        },
      },
      institution: true,
      occurrences: true,
    },
  });
};

export const getEventsFiltered = async ({
  event_type,
  area,
  is_recurring,
  startDate,
  endDate,
  category,
  province_id,
  city_id,
  institution_id,
}: FilteredEventsOptions): Promise<EventWithRelations[]> => {
  const where: Prisma.EventWhereInput = {};

  if (event_type) {
    where.event_type = Array.isArray(event_type) ? { in: event_type } : event_type;
  }

  if (category) {
    where.category = Array.isArray(category) ? { in: category } : category;
  }

  if (is_recurring !== undefined) {
    where.is_recurring = is_recurring;
  }

  if (area !== undefined && area !== null) {
    const areaFilter = Array.isArray(area) ? { in: area } : area;
    where.OR = [
      { fotang: { area: areaFilter } },
      { eventLocation: { area: areaFilter } },
    ];
  }

  if (province_id || city_id) {
    const provinceIds = province_id
      ? (Array.isArray(province_id) ? province_id : [province_id])
          .map(p => parseInt(p as string, 10))
          .filter(n => !isNaN(n))
      : [];

    const cityIds = city_id
      ? (Array.isArray(city_id) ? city_id : [city_id])
          .map(c => parseInt(c as string, 10))
          .filter(n => !isNaN(n))
      : [];

    if (provinceIds.length === 0 && cityIds.length === 0) {
    } else {
      const orConditions: Prisma.EventWhereInput[] = [];

      if (cityIds.length > 0 || provinceIds.length > 0) {
        const cityWhere: Prisma.CityWhereInput = {};

        if (cityIds.length > 0) cityWhere.id = { in: cityIds };
        if (provinceIds.length > 0) cityWhere.province = { id: { in: provinceIds } };

        orConditions.push({
          eventLocation: {
            city: cityWhere,
          },
        });
      }

      if (cityIds.length > 0 || provinceIds.length > 0) {
        const cityWhere: Prisma.CityWhereInput = {};

        if (cityIds.length > 0) cityWhere.id = { in: cityIds };
        if (provinceIds.length > 0) cityWhere.province = { id: { in: provinceIds } };

        orConditions.push({
          fotang: {
            locality: {
              district: {
                city: cityWhere,
              },
            },
          },
        });
      }

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: orConditions },
        ];
        delete where.OR;
      } else {
        where.OR = orConditions;
      }
    }
  }

  if (startDate || endDate) {
    where.occurrences = {
      some: {
        greg_occur_date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
        ...(endDate && {
          OR: [
            { greg_end_date: { lte: new Date(endDate) } },
            { greg_end_date: null },
          ],
        }),
      },
    };
  }

  if (institution_id) {
    const institutionIds = Array.isArray(institution_id)
      ? institution_id.map(id => parseInt(id as string, 10)).filter(n => !isNaN(n))
      : [parseInt(institution_id as string, 10)].filter(n => !isNaN(n));

    if (institutionIds.length > 0) {
      where.institution = {
        institution_id: { in: institutionIds }
      };
    }
  }

  return await prisma.event.findMany({
    where,
    include: {
      fotang: true,
      eventLocation: {
        include: {
          city: { include: { province: { select: { name: true } } } },
        },
      },
      institution: true,
      occurrences: true,
    },
  });
};

export const getEventById = async (eventId: number): Promise<EventWithRelations | null> => {
  return await prisma.event.findUnique({
    where: { event_id: eventId },
    include: {
      fotang: true,
      eventLocation: {
        include: {
          city: { include: { province: { select: { name: true } } } },
        },
      },
      institution: true,
      occurrences: true,
    },
  });
};

export const createEvent = async (data: CreateEventInput): Promise<EventWithRelations> => {
  return await prisma.$transaction(async (tx) => {
    if (!data.event_name) throw new Error("event_name required");
    if (data.occurrences.length === 0) throw new Error("At least one occurrence required");
    if (data.is_in_fotang && !data.fotangId) throw new Error("fotangId required");
    if (!data.is_in_fotang && (!data.cityId || !data.location_name || !data.area)) {
      throw new Error("cityId, location_name, area required for manual location");
    }

    let eventData: Prisma.EventCreateInput = {
      category: data.category,
      event_type: data.event_type,
      event_name: data.event_name,
      event_mandarin_name: data.event_mandarin_name ?? null,
      is_in_fotang: data.is_in_fotang,
      is_recurring: data.is_recurring,
      description: data.description ?? null,
      poster_s3_bucket_link: data.poster_s3_bucket_link || null,
    };

    if (data.is_in_fotang) {
      eventData.fotang = { connect: { fotang_id: data.fotangId! } };
    } else {
      const eventLocation = await tx.eventLocation.create({
        data: {
          location_name: data.location_name!,
          cityId: data.cityId!,
          street: data.street ?? null,
          postal_code: data.postal_code ?? null,
          area: data.area!,
        },
      });
      eventData.eventLocation = { connect: { event_location_id: eventLocation.event_location_id } };
    }

    if (data.category === 'External' && data.institutionId) {
      eventData.institution = { connect: { institution_id: data.institutionId } };
    }

    if (data.category === 'Internal') {
      eventData.lunar_sui_ci_year = data.lunar_sui_ci_year ?? null;
      eventData.lunar_month = data.lunar_month ?? null;
      eventData.lunar_day = data.lunar_day ?? null;
    }

    return await tx.event.create({
      data: {
        ...eventData,
        occurrences: {
          create: data.occurrences.map(o => ({
            greg_occur_date: o.greg_occur_date,
            greg_end_date: o.greg_end_date ?? null,
          })),
        },
      },
      include: {
        fotang: true,
        eventLocation: {
          include: {
            city: { include: { province: { select: { name: true } } } },
          },
        },
        institution: true,
        occurrences: true,
      },
    });
  });
};

export const updateEvent = async (
  eventId: number,
  data: UpdateEventInput
): Promise<EventWithRelations> => {
  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { event_id: eventId } });
    if (!event) throw new Error("Event not found");

    const updateData: Prisma.EventUpdateInput = {};

    if (data.event_type) updateData.event_type = data.event_type;
    if (data.event_name) updateData.event_name = data.event_name;
    if (data.event_mandarin_name !== undefined) updateData.event_mandarin_name = data.event_mandarin_name;
    if (data.is_recurring !== undefined) updateData.is_recurring = data.is_recurring;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.poster_s3_bucket_link !== undefined) updateData.poster_s3_bucket_link = data.poster_s3_bucket_link;

    if (data.is_in_fotang !== undefined) {
      updateData.is_in_fotang = data.is_in_fotang;
      if (data.is_in_fotang) {
        updateData.fotang = data.fotangId ? { connect: { fotang_id: data.fotangId } } : { disconnect: true };
        updateData.eventLocation = { disconnect: true };
      } else {
        if (!data.cityId || !data.location_name || !data.area) throw new Error("cityId, location_name, area required");
        const el = await tx.eventLocation.upsert({
          where: { event_location_id: data.eventLocationId ?? -1 },
          update: {
            location_name: data.location_name,
            cityId: data.cityId,
            street: data.street ?? null,
            postal_code: data.postal_code ?? null,
            area: data.area,
          },
          create: {
            location_name: data.location_name,
            cityId: data.cityId,
            street: data.street ?? null,
            postal_code: data.postal_code ?? null,
            area: data.area,
          },
        });
        updateData.eventLocation = { connect: { event_location_id: el.event_location_id } };
        updateData.fotang = { disconnect: true };
      }
    }

    if (data.institutionId !== undefined) {
      updateData.institution = data.institutionId
        ? { connect: { institution_id: data.institutionId } }
        : { disconnect: true };
    }

    if (data.lunar_sui_ci_year !== undefined) updateData.lunar_sui_ci_year = data.lunar_sui_ci_year;
    if (data.lunar_month !== undefined) updateData.lunar_month = data.lunar_month;
    if (data.lunar_day !== undefined) updateData.lunar_day = data.lunar_day;

    if (data.occurrences) {
      await tx.occurrence.deleteMany({ where: { event_id: eventId } });
      updateData.occurrences = {
        create: data.occurrences.map(o => ({
          greg_occur_date: o.greg_occur_date,
          greg_end_date: o.greg_end_date ?? null,
        })),
      };
    }

    return await tx.event.update({
      where: { event_id: eventId },
      data: updateData,
      include: {
        fotang: true,
        eventLocation: {
          include: {
            city: { include: { province: { select: { name: true } } } },
          },
        },
        institution: true,
        occurrences: true,
      },
    });
  });
};

export const deleteEvent = async (eventId: number): Promise<Event> => {
  return await prisma.$transaction(async (tx) => {
    await tx.occurrence.deleteMany({ where: { event_id: eventId } });
    return await tx.event.delete({ where: { event_id: eventId } });
  });
};