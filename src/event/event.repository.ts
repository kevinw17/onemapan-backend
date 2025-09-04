import { Event, Occurrence, Location, Prisma, EventType } from "@prisma/client";
import prisma from "../db";

// Define the type for Event with relations
type EventWithRelations = Event & {
    location: Location;
    occurrences: Occurrence[];
};

// Input type for creating an event
type CreateEventInput = Omit<Event, "event_id" | "created_at" | "updated_at" | "locationId"> & {
    locationData: Omit<Location, "location_id" | "created_at" | "updated_at"> & {
        provinceId: number;
        cityId: number;
        districtId: number;
    };
    occurrences: { greg_occur_date: Date }[];
};

// Input type for updating an event
type UpdateEventInput = Partial<Omit<Event, "event_id" | "created_at" | "updated_at">> & {
    locationData?: Partial<Omit<Location, "location_id" | "created_at" | "updated_at">> & {
        provinceId?: number;
        cityId?: number;
        districtId?: number;
    };
    occurrences?: { greg_occur_date: Date }[];
};

// Interface for filtered events options
interface FilteredEventsOptions {
  event_type?: EventType | EventType[];
  provinceId?: number | number[];
}

export const getAllEvents = async (): Promise<EventWithRelations[]> => {
    return await prisma.event.findMany({
        include: {
            location: {
                include: {
                    locality: {
                        include: {
                            district: {
                                include: {
                                    city: {
                                        include: {
                                            province: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            occurrences: true,
        },
    });
};

export const getEventsFiltered = async ({
  event_type,
  provinceId,
}: FilteredEventsOptions): Promise<EventWithRelations[]> => {
  console.log("Received Filter Params:", { event_type, provinceId });

  const where: Prisma.EventWhereInput = {};

  // Handle event_type filter
  if (event_type) {
    if (Array.isArray(event_type) && event_type.length > 0) {
      where.event_type = { in: event_type };
    } else if (typeof event_type === "string" && event_type.trim() !== "") {
      where.event_type = { equals: event_type as EventType };
    }
  }

  // Handle provinceId filter
  if (provinceId) {
    const provinceIds = Array.isArray(provinceId)
      ? provinceId
      : typeof provinceId === "number"
        ? [provinceId]
        : [];
    if (provinceIds.length > 0) {
      where.location = {
        locality: {
          district: {
            city: {
              provinceId: { in: provinceIds },
            },
          },
        },
      };
    }
  }

  console.log("Where Clause:", JSON.stringify(where, null, 2));

  return await prisma.event.findMany({
    where,
    include: {
      location: {
        include: {
          locality: {
            include: {
              district: {
                include: {
                  city: {
                    include: {
                      province: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      occurrences: true,
    },
  });
};

export const getEventById = async (eventId: number): Promise<EventWithRelations | null> => {
    return await prisma.event.findUnique({
        where: { event_id: eventId },
        include: {
            location: {
                include: {
                    locality: {
                        include: {
                            district: {
                                include: {
                                    city: {
                                        include: {
                                            province: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            occurrences: true,
        },
    });
};

export const createEvent = async (data: CreateEventInput): Promise<EventWithRelations> => {
    return await prisma.$transaction(async (tx) => {
        // Validate required location fields
        if (!data.locationData.provinceId || !data.locationData.cityId || !data.locationData.districtId || !data.locationData.localityId) {
            throw new Error("ProvinceId, cityId, districtId, and localityId are required");
        }

        // Create Location record
        const newLocation = await tx.location.create({
            data: {
                location_name: data.locationData.location_name,
                location_mandarin_name: data.locationData.location_mandarin_name || null,
                localityId: data.locationData.localityId,
                street: data.locationData.street || null,
                postal_code: data.locationData.postal_code || null,
                country_iso: data.locationData.country_iso || "IDN",
                latitude: data.locationData.latitude || null,
                longitude: data.locationData.longitude || null,
            },
        });

        // Create Event record with locationId
        const newEvent = await tx.event.create({
            data: {
                event_type: data.event_type,
                event_name: data.event_name,
                event_mandarin_name: data.event_mandarin_name || null,
                location: {
                    connect: { location_id: newLocation.location_id },
                },
                lunar_sui_ci_year: data.lunar_sui_ci_year,
                lunar_month: data.lunar_month,
                lunar_day: data.lunar_day,
                is_recurring: data.is_recurring,
                description: data.description || null,
                poster_s3_bucket_link: data.poster_s3_bucket_link || null,
                occurrences: {
                    create: data.occurrences.map((occ) => ({
                        greg_occur_date: occ.greg_occur_date,
                    })),
                },
            },
            include: {
                location: {
                    include: {
                        locality: {
                            include: {
                                district: {
                                    include: {
                                        city: {
                                            include: {
                                                province: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                occurrences: true,
            },
        });

        return newEvent;
    });
};

export const updateEvent = async (
    eventId: number,
    data: UpdateEventInput
): Promise<EventWithRelations> => {
    return await prisma.$transaction(async (tx) => {
        // Update Location if locationData is provided
        if (data.locationData && data.locationId) {
            if (!data.locationData.provinceId || !data.locationData.cityId || !data.locationData.districtId || !data.locationData.localityId) {
                throw new Error("ProvinceId, cityId, districtId, and localityId are required if locationData is provided");
            }
            await tx.location.update({
                where: { location_id: data.locationId },
                data: {
                    location_name: data.locationData.location_name,
                    location_mandarin_name: data.locationData.location_mandarin_name ?? null,
                    localityId: data.locationData.localityId,
                    street: data.locationData.street ?? null,
                    postal_code: data.locationData.postal_code ?? null,
                    country_iso: data.locationData.country_iso ?? "IDN",
                    latitude: data.locationData.latitude ?? null,
                    longitude: data.locationData.longitude ?? null,
                },
            });
        }

        // Prepare event update data
        const eventUpdateData: Prisma.EventUpdateInput = {
            event_type: data.event_type,
            event_name: data.event_name,
            event_mandarin_name: data.event_mandarin_name ?? null,
            lunar_sui_ci_year: data.lunar_sui_ci_year,
            lunar_month: data.lunar_month,
            lunar_day: data.lunar_day,
            is_recurring: data.is_recurring,
            description: data.description ?? null,
            poster_s3_bucket_link: data.poster_s3_bucket_link ?? null,
        };

        // Update occurrences if provided
        if (data.occurrences && data.occurrences.length > 0) {
            // Delete existing occurrences
            await tx.occurrence.deleteMany({
                where: { event_id: eventId },
            });
            // Create new occurrences
            eventUpdateData.occurrences = {
                create: data.occurrences.map((occ) => ({
                    greg_occur_date: occ.greg_occur_date,
                })),
            };
        }

        // Update Event
        return await tx.event.update({
            where: { event_id: eventId },
            data: eventUpdateData,
            include: {
                location: {
                    include: {
                        locality: {
                            include: {
                                district: {
                                    include: {
                                        city: {
                                            include: {
                                                province: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                occurrences: true,
            },
        });
    });
};

export const deleteEvent = async (eventId: number): Promise<Event> => {
    if (!eventId || isNaN(eventId)) {
        throw new Error("Invalid event ID provided");
    }

    console.log(`Starting deletion process for event ID: ${eventId} at ${new Date().toISOString()}`);

    try {
        // Verify if the event exists
        const eventExists = await prisma.event.findUnique({
            where: { event_id: eventId },
            include: {
                location: true,
                occurrences: true,
            },
        });
        if (!eventExists) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        console.log(`Event ${eventId} found with ${eventExists.occurrences.length} occurrences`);

        // Start transaction
        return await prisma.$transaction(async (tx) => {
            // Delete all related occurrences
            const deletedOccurrences = await tx.occurrence.deleteMany({
                where: { event_id: eventId },
            });
            console.log(`Deleted ${deletedOccurrences.count} occurrences for event ${eventId}`);

            // Delete the event
            const deletedEvent = await tx.event.delete({
                where: { event_id: eventId },
            });
            console.log(`Successfully deleted event ${eventId}`);
            return deletedEvent;
        });
    } catch (error) {
        throw error; // Propagate the error to the caller
    }
};

export const createOccurrence = async (
    eventId: number,
    data: Omit<Occurrence, "occurrence_id" | "created_at" | "updated_at">
): Promise<Occurrence> => {
    return await prisma.occurrence.create({
        data: { ...data, event_id: eventId },
    });
};