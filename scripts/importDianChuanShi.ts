import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as readline from 'readline';

const prisma = new PrismaClient();

type Korwil = 'Korwil_1' | 'Korwil_2' | 'Korwil_3' | 'Korwil_4' | 'Korwil_5' | 'Korwil_6';

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            result.push(currentField);
            currentField = '';
            continue;
        }

        currentField += char;
    }

    result.push(currentField);
    return result.map((field) => field.trim().replace(/^"|"$/g, ''));
}

async function importCSV(path: string): Promise<string[][]> {
    if (!fs.existsSync(path)) {
        console.error(`File ${path} not found!`);
        return [];
    }
    const result: string[][] = [];
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue;
        }
        const row = parseCSVLine(line);
        console.log(`Parsed row: ${JSON.stringify(row)}`);
        if (row.length >= 4) {
            result.push(row);
        } else {
            console.warn(`Skipping invalid row: ${line}`);
        }
    }

    return result;
}

function validateArea(area: string | undefined): Korwil {
    const validAreas: Korwil[] = ['Korwil_1', 'Korwil_2', 'Korwil_3', 'Korwil_4', 'Korwil_5', 'Korwil_6'];
    const trimmedArea = area?.trim();
    if (!trimmedArea || !validAreas.includes(trimmedArea as Korwil)) {
        console.log(`Invalid area value: ${trimmedArea}, defaulting to Korwil_1`);
        return 'Korwil_1';
    }
    return trimmedArea as Korwil;
}

async function main() {
    const initialCount = await prisma.dianChuanShi.count();
    console.log(`Total records before import: ${initialCount}`);

    const dcsCSV = await importCSV('./data/dian_chuan_shi.csv');
    if (dcsCSV.length === 0) {
        console.log('No valid data found in CSV file. Exiting.');
        return;
    }
    console.log('Parsed CSV:', dcsCSV);

    const dcsData = dcsCSV.map(([id, name, mandarin_name, area, is_fuwuyuan], index) => {
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            console.warn(`Invalid ID at row ${index + 2}: ${id}, skipping row`);
            return null;
        }
        if (!name) {
            console.warn(`Empty name at row ${index + 2}, skipping row`);
            return null;
        }
        return {
            id: parsedId,
            name: name.trim(),
            mandarin_name: mandarin_name?.trim() || "-",
            area: validateArea(area),
            is_fuwuyuan: is_fuwuyuan?.toLowerCase() === 'true' || is_fuwuyuan === '1',
        };
    }).filter((data): data is NonNullable<typeof data> => data !== null);
    console.log('Mapped Data:', dcsData);

    if (dcsData.length === 0) {
        console.log('No valid data to import. Exiting.');
        return;
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const dcs of dcsData) {
        try {
            const existing = await prisma.dianChuanShi.findUnique({ where: { id: dcs.id } });
            if (existing) {
                console.log(`Data for id ${dcs.id} already exists, updating instead`);
                await prisma.dianChuanShi.update({
                    where: { id: dcs.id },
                    data: {
                        name: dcs.name,
                        mandarin_name: dcs.mandarin_name,
                        area: dcs.area,
                        is_fuwuyuan: dcs.is_fuwuyuan,
                    },
                });
                updatedCount++;
            } else {
                console.log(`Creating new data for id: ${dcs.id}`);
                await prisma.dianChuanShi.create({
                    data: dcs,
                });
                createdCount++;
            }
        } catch (error) {
            console.error(`Failed to process data for id: ${dcs.id}`, error);
        }
    }
}

main()
    .catch((error) => {
        console.error('Main error:', error);
    })
    .finally(() => prisma.$disconnect());