import { PrismaClient, Korwil } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface FotangCSVRow {
    fotang_id: string;
    location_name: string;
    location_mandarin_name?: string;
    latitude?: string;
    longitude?: string;
    area: string;
    country_iso: string;
    localityId: string;
    street?: string;
    postal_code?: string;
}

interface FotangData {
    fotang_id: number;
    location_name: string;
    location_mandarin_name?: string;
    latitude?: number;
    longitude?: number;
    area: Korwil;
    country_iso: string;
    localityId: number;
    street?: string;
    postal_code?: string;
}

function importCSV(path: string, delimiter: string = ';'): FotangCSVRow[] {
    const fileContent = readFileSync(path, 'utf-8');
    const records = parse(fileContent, {
        delimiter,
        trim: true,
        skip_records_with_error: true,
        skip_empty_lines: true,
        columns: true,
    });
    return records as FotangCSVRow[];
}

async function main() {
    try {
        // Impor data dari CSV
        const fotangCSV = importCSV('./data/fotang.csv');

        // Validasi dan transformasi data
        const fotangData: FotangData[] = fotangCSV.map((row, index) => {
        const fotang_id = parseInt(row.fotang_id);
        const localityId = parseInt(row.localityId);
        const latitude = row.latitude ? parseInt(row.latitude) : undefined;
        const longitude = row.longitude ? parseInt(row.longitude) : undefined;

        // Validasi fotang_id dan localityId
        if (isNaN(fotang_id)) {
            throw new Error(`Invalid fotang_id at row ${index + 2}: ${row.fotang_id}`);
        }
        if (isNaN(localityId)) {
            throw new Error(`Invalid localityId at row ${index + 2}: ${row.localityId}`);
        }

        // Validasi area sebagai enum Korwil
        const validKorwil = Object.values(Korwil).includes(row.area as Korwil);
        if (!validKorwil) {
            throw new Error(`Invalid area at row ${index + 2}: ${row.area}. Must be one of ${Object.values(Korwil).join(', ')}`);
        }

        return {
            fotang_id,
            location_name: row.location_name,
            location_mandarin_name: row.location_mandarin_name || undefined,
            latitude,
            longitude,
            area: row.area as Korwil,
            country_iso: row.country_iso || 'IDN',
            localityId,
            street: row.street || undefined,
            postal_code: row.postal_code || undefined,
        };
        });

        // Upsert data ke database
        for (const fotang of fotangData) {
        await prisma.fotang.upsert({
            where: { fotang_id: fotang.fotang_id },
            update: {
            location_name: fotang.location_name,
            location_mandarin_name: fotang.location_mandarin_name,
            latitude: fotang.latitude,
            longitude: fotang.longitude,
            area: fotang.area,
            country_iso: fotang.country_iso,
            localityId: fotang.localityId,
            street: fotang.street,
            postal_code: fotang.postal_code,
            },
            create: fotang,
        });
        console.log(`Processed fotang_id: ${fotang.fotang_id}`);
        }

        console.log("Import data Fotang selesai.");
    } catch (error) {
        console.error("Error importing Fotang data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();