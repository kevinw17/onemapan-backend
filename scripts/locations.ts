import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function importCSV(path: string): Promise<string[][]> {
    const result: string[][] = [];
    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let isFirst = true;
    for await (const line of rl) {
        if (isFirst) {
        isFirst = false;
        continue;
        }

        const row = line.split(";").map((s) => s.trim().replace(/^"|"$/g, ""));
        if (row.length > 1) result.push(row);
    }

    return result;
}

async function main() {
    const provincesCSV = await importCSV('./data/provinces.csv');
    const provinceData = provincesCSV.map(([id, name]) => ({
        id: parseInt(id),
        name,
    }));
    await prisma.province.createMany({ data: provinceData, skipDuplicates: true });

    const citiesCSV = await importCSV('./data/cities.csv');
    const cityData = citiesCSV.map(([id, name, provinceId ]) => ({
        id: parseInt(id),
        name,
        provinceId: parseInt(provinceId),
    }));
    await prisma.city.createMany({ data: cityData, skipDuplicates: true });

    const districtsCSV = await importCSV("./data/districts.csv");
    const cityIdMap = new Map<string, number>();
    let newCityId = 1;

    const districtData = districtsCSV.map(([id, name, oldCityId ]) => {
        if (!cityIdMap.has(oldCityId)) {
        cityIdMap.set(oldCityId, newCityId++);
        }
        return {
        name,
        cityId: cityIdMap.get(oldCityId)!,
        };
    });

    const createdDistricts = await prisma.district.createMany({
        data: districtData,
        skipDuplicates: true,
    });

    const districtsInDb = await prisma.district.findMany();
    const districtMap = new Map<string, number>();

    let i = 0;
    for (const [oldDistrictRow] of districtsCSV) {
        const dbDistrict = districtsInDb[i];
        districtMap.set(oldDistrictRow, dbDistrict.id);
        i++;
    }

    const localitiesCSV = await importCSV("./data/localities.csv");
    const localityData = localitiesCSV.map(([id, name, oldDistrictId ]) => {
        const newDistrictId = districtMap.get(oldDistrictId);
        if (!newDistrictId) throw new Error(`districtId ${oldDistrictId} tidak ditemukan`);
        return {
        name,
        districtId: newDistrictId,
        };
    });

    await prisma.locality.createMany({ data: localityData, skipDuplicates: true });

    console.log("Import selesai.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
