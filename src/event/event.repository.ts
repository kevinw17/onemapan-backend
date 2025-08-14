import { Event, Occurrence } from "@prisma/client";
import prisma from "../db";

export const getAllEvents = async (): Promise<Event[]> => {
    return await prisma.event.findMany({
        include: { occurrences: true },
    });
};

export const getEventById = async (eventId: number): Promise<Event | null> => {
    return await prisma.event.findUnique({
        where: { event_id: eventId },
        include: { occurrences: true },
    });
};

export const createEvent = async (data: Omit<Event, "event_id" | "created_at" | "updated_at">): Promise<Event> => {
    return await prisma.event.create({
        data,
        include: { occurrences: true },
    });
};

export const updateEvent = async (eventId: number, data: Partial<Omit<Event, "event_id" | "created_at" | "updated_at">>): Promise<Event> => {
    return await prisma.event.update({
        where: { event_id: eventId },
        data,
        include: { occurrences: true },
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
            include: { occurrences: true }, // Include occurrences to count them
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

export const createOccurrence = async (eventId: number, data: Omit<Occurrence, "occurrence_id" | "created_at" | "updated_at">): Promise<Occurrence> => {
    return await prisma.occurrence.create({
        data: { ...data, event_id: eventId },
    });
};