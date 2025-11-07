import prisma from "../db";

export const findAllDianChuanShi = async () => {
    return await prisma.dianChuanShi.findMany({
        select: {
        id: true,
        name: true,
        mandarin_name: true,
        area: true,
        is_fuwuyuan: true,
        },
        orderBy: { name: "asc" },
    });
};
