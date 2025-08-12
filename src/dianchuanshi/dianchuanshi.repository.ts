import prisma from "../db";

export const findAllDianChuanShi = async () => {
    return await prisma.dianChuanShi.findMany({
        orderBy: { name: "asc" },
    });
};
