import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Menghapus semua data lokasi...");

    await prisma.locality.deleteMany();
    await prisma.district.deleteMany();
    await prisma.city.deleteMany();
    await prisma.province.deleteMany();

    console.log("Semua data lokasi berhasil dihapus.");
}

main()
    .catch((e) => {
        console.error("Gagal menghapus data:", e);
    })
    .finally(() => prisma.$disconnect());
