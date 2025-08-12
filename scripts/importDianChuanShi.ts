import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function importCSV(path: string, delimiter = ";"): Promise<string[][]> {
    const result: string[][] = [];
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirstLine = true;
    for await (const line of rl) {
        if (isFirstLine) {
        isFirstLine = false;
        continue;
        }

        const row = line.split(delimiter).map((s) => s.trim().replace(/^"|"$/g, ""));
        if (row.length > 1) result.push(row);
    }

    return result;
}

async function main() {
    const dcsCSV = await importCSV('./data/dian_chuan_shi.csv');
    const dcsData = dcsCSV.map(([id, name, mandarin_name]) => ({
        id: parseInt(id),
        name,
        mandarin_name: mandarin_name?.trim() || "-",
    }));

    for (const dcs of dcsData) {
        await prisma.dianChuanShi.upsert({
            where: { id: dcs.id },
            update: {
                name: dcs.name,
                mandarin_name: dcs.mandarin_name,
            },
            create: dcs,
        });
    }

    console.log("Import data Dian Chuan Shi selesai.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
