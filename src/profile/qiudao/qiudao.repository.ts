import prisma from "../../db";
import { Prisma, QiuDao, Korwil } from "@prisma/client";

export const createQiuDao = async (
  data: Prisma.QiuDaoCreateInput
): Promise<QiuDao> => {
  return await prisma.qiuDao.create({ data });
};

export type QiuDaoWithRelations = Prisma.QiuDaoGetPayload<{
  include: {
    dian_chuan_shi: true;
    qiu_dao_location: {
      include: {
        locality: {
          include: {
            district: {
              include: {
                city: {
                  include: { province: true };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

export const getAllQiuDao = async (): Promise<QiuDaoWithRelations[]> => {
  return await prisma.qiuDao.findMany({
    include: {
      dian_chuan_shi: true,
      qiu_dao_location: {
        include: {
          locality: {
            include: {
              district: {
                include: {
                  city: {
                    include: { province: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

export const findQiuDaoById = async (
  id: number
): Promise<QiuDaoWithRelations | null> => {
  return await prisma.qiuDao.findUnique({
    where: { qiu_dao_id: id },
    include: {
      qiu_dao_location: {
        include: {
          locality: {
            include: {
              district: {
                include: {
                  city: {
                    include: { province: true },
                  },
                },
              },
            },
          },
        },
      },
      dian_chuan_shi: true,
    },
  });
};

export const updateQiuDao = async (
  id: number,
  data: Prisma.QiuDaoUpdateInput
): Promise<QiuDao> => {
  return await prisma.qiuDao.update({
    where: { qiu_dao_id: id },
    data,
  });
};

export const removeQiuDao = async (
  id: number
): Promise<QiuDao> => {
  const userCount = await prisma.user.count({
    where: { qiu_dao_id: id },
  });

  if (userCount > 0) {
    throw new Error("Masih ada user yang terkait dengan qiudao ini.");
  }

  return await prisma.qiuDao.delete({
    where: { qiu_dao_id: id },
  });
};

interface QiudaoPaginationOptions {
  skip: number;
  limit: number;
  search?: string[];
  searchField?: string[];
  location_name?: string[];
  location_mandarin_name?: string[];
  dian_chuan_shi_name?: string[];
  dian_chuan_shi_mandarin_name?: string[];
  yin_shi_qd_name?: string[];
  yin_shi_qd_mandarin_name?: string[];
  bao_shi_qd_name?: string[];
  bao_shi_qd_mandarin_name?: string[];
  userId?: number;
  userArea?: Korwil; // Tambahkan userArea untuk filter wilayah
}

export const getQiudaosPaginated = async ({
  skip,
  limit,
  search = [],
  searchField = [],
  location_name = [],
  location_mandarin_name = [],
  dian_chuan_shi_name = [],
  dian_chuan_shi_mandarin_name = [],
  yin_shi_qd_name = [],
  yin_shi_qd_mandarin_name = [],
  bao_shi_qd_name = [],
  bao_shi_qd_mandarin_name = [],
  userId,
  userArea, // Tambahkan ke parameter
}: QiudaoPaginationOptions): Promise<{
  data: QiuDaoWithRelations[];
  total: number;
}> => {
  console.log("[getQiudaosPaginated] Input:", {
    skip,
    limit,
    search,
    searchField,
    location_name,
    location_mandarin_name,
    dian_chuan_shi_name,
    dian_chuan_shi_mandarin_name,
    yin_shi_qd_name,
    yin_shi_qd_mandarin_name,
    bao_shi_qd_name,
    bao_shi_qd_mandarin_name,
    userId,
    userArea,
  });

  const filters: Prisma.QiuDaoWhereInput[] = [];

  // 1. Basic search (search + searchField)
  search.forEach((s, i) => {
    const field = searchField[i] || "qiu_dao_mandarin_name";
    
    const searchableFields = [
      "qiu_dao_name",
      "qiu_dao_mandarin_name",
      "lunar_sui_ci_year",
      "lunar_month",
      "lunar_day",
      "lunar_shi_chen_time",
      "yin_shi_qd_name",
      "yin_shi_qd_mandarin_name",
      "bao_shi_qd_name",
      "bao_shi_qd_mandarin_name",
    ];

    if (searchableFields.includes(field)) {
      filters.push({ [field]: { contains: s, mode: "insensitive" } });
    } else if (field === "dian_chuan_shi.name") {
      filters.push({ dian_chuan_shi: { name: { contains: s, mode: "insensitive" } } });
    } else if (field === "dian_chuan_shi.mandarin_name") {
      filters.push({ dian_chuan_shi: { mandarin_name: { contains: s, mode: "insensitive" } } });
    }
  });

  // === 2. MULTIPLE FILTERS (checkbox) ===
  if (location_name.length > 0) {
    filters.push({ qiu_dao_location: { location_name: { in: location_name } } });
  }
  if (location_mandarin_name.length > 0) {
    filters.push({ qiu_dao_location: { location_mandarin_name: { in: location_mandarin_name } } });
  }
  if (dian_chuan_shi_name.length > 0) {
    filters.push({ dian_chuan_shi: { name: { in: dian_chuan_shi_name } } });
  }
  if (dian_chuan_shi_mandarin_name.length > 0) {
    filters.push({ dian_chuan_shi: { mandarin_name: { in: dian_chuan_shi_mandarin_name } } });
  }
  if (yin_shi_qd_name.length > 0) {
    filters.push({ yin_shi_qd_name: { in: yin_shi_qd_name } });
  }
  if (yin_shi_qd_mandarin_name.length > 0) {
    filters.push({ yin_shi_qd_mandarin_name: { in: yin_shi_qd_mandarin_name } });
  }
  if (bao_shi_qd_name.length > 0) {
    filters.push({ bao_shi_qd_name: { in: bao_shi_qd_name } });
  }
  if (bao_shi_qd_mandarin_name.length > 0) {
    filters.push({ bao_shi_qd_mandarin_name: { in: bao_shi_qd_mandarin_name } });
  }

  // === 3. SCOPE: self ===
  if (userId) {
    const ids = await prisma.user
      .findMany({ where: { user_info_id: userId }, select: { qiu_dao_id: true } })
      .then(users => users.map(u => u.qiu_dao_id).filter((id): id is number => id !== null));
    if (ids.length > 0) {
      filters.push({ qiu_dao_id: { in: ids } });
    } else {
      filters.push({ qiu_dao_id: { equals: -1 } });
    }
  }

  // === 4. FILTER BY AREA (Admin wilayah) ===
  if (userArea) {
    filters.push({ qiu_dao_location: { area: userArea } });
  }

  const where = filters.length > 0 ? { AND: filters } : {};
  console.log("[getQiudaosPaginated] WHERE:", JSON.stringify(where, null, 2));

  const [data, total] = await Promise.all([
    prisma.qiuDao.findMany({
      where,
      skip,
      take: limit,
      include: {
        dian_chuan_shi: true,
        qiu_dao_location: {
          include: {
            locality: {
              include: {
                district: {
                  include: {
                    city: { include: { province: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.qiuDao.count({ where }),
  ]);

  console.log(`[getQiudaosPaginated] Result: ${data.length} items, total: ${total}`);
  return { data, total };
};