import prisma from "../../db";
import { Prisma, QiuDao } from "@prisma/client";

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
                  include: {
                    province: true;
                  };
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
    },
  });
};

export const findQiuDaoById = async (
  id: number
): Promise<QiuDao | null> => {
  return await prisma.qiuDao.findUnique({
    where: { qiu_dao_id: id },
    include: {
      qiu_dao_location: true,
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
  search: string;
  searchField: string;
}

export const getQiudaosPaginated = async ({
  skip,
  limit,
  search,
  searchField,
}: QiudaoPaginationOptions): Promise<{
  data: QiuDao[];
  total: number;
}> => {
  const nestedFields: Record<string, Prisma.QiuDaoWhereInput> = {
    "qiu_dao_location.city": {
      qiu_dao_location: {
        locality: {
          district: {
            city: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      },
    },
    "qiu_dao_location.province": {
      qiu_dao_location: {
        locality: {
          district: {
            city: {
              province: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
    },
    "qiu_dao_location.district": {
      qiu_dao_location: {
        locality: {
          district: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    },
    "qiu_dao_location.locality": {
      qiu_dao_location: {
        locality: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    },
    "dian_chuan_shi_name": {
    dian_chuan_shi: {
      name: {
        contains: search,
        mode: "insensitive",
      },
    },
  },
  "dian_chuan_shi_mandarin_name": {
    dian_chuan_shi: {
      mandarin_name: {
        contains: search,
        mode: "insensitive",
      },
    },
  },
  };

  let where: Prisma.QiuDaoWhereInput;

  if (nestedFields[searchField]) {
    where = nestedFields[searchField];
  } else {
    const searchableFields = [
      "qiu_dao_name",
      "qiu_dao_mandarin_name",
      "dian_chuan_shi_name",
      "dian_chuan_shi_mandarin_name",
      "yin_shi_qd_name",
      "yin_shi_qd_mandarin_name",
      "bao_shi_qd_name",
      "bao_shi_qd_mandarin_name",
      "lunar_sui_ci_year",
      "lunar_month",
      "lunar_day",
      "lunar_shi_chen_time",
    ];

    const field = searchableFields.includes(searchField)
      ? (searchField as keyof Prisma.QiuDaoWhereInput)
      : "qiu_dao_mandarin_name";

    where = {
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    } as Prisma.QiuDaoWhereInput;
  }

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
      },
    }),
    prisma.qiuDao.count({ where }),
  ]);

  return { data, total };
};