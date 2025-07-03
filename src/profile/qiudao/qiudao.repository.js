const prisma = require("../../db");

const createQiuDao = async (data) => {
  return await prisma.qiuDao.create({ data });
};

const getAllQiuDao = async () => {
  return await prisma.qiuDao.findMany({
    include: {
      qiu_dao_location: true
    }
  });
};

const findQiuDaoById = async (id) => {
  return await prisma.qiuDao.findUnique({
    where: { qiu_dao_id: id },
    include: {
      qiu_dao_location: true,
    },
  });
};

const updateQiuDao = async (id, data) => {
  return await prisma.qiuDao.update({
    where: { qiu_dao_id: id },
    data,
  });
};

const removeQiuDao = async (id) => {
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

const getQiudaosPaginated = async ({ skip, limit, search, searchField }) => {
  const nestedFields = {
    "qiu_dao_location.city": {
      qiu_dao_location: { city: { contains: search, mode: "insensitive" } }
    },
  };

  let where;

  if (nestedFields[searchField]) {
    where = nestedFields[searchField];
  } else {
    const searchableFields = [
      "qiu_dao_name", "qiu_dao_mandarin_name", "dian_chuan_shi_name",
      "dian_chuan_shi_mandarin_name", "yin_shi_qd_name", "yin_shi_qd_mandarin_name",
      "bao_shi_qd_name", "bao_shi_qd_mandarin_name", "lunar_sui_ci_year",
      "lunar_month", "lunar_day", "lunar_shi_chen_time"
    ];

    const field = searchableFields.includes(searchField)
      ? searchField
      : "qiu_dao_mandarin_name";

    where = {
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  const [data, total] = await Promise.all([
    prisma.qiuDao.findMany({
      where,
      skip,
      take: limit,
      include: {
        qiu_dao_location: true
      },
    }),
    prisma.qiuDao.count({ where }),
  ]);

  return { data, total };
};

module.exports = {
  createQiuDao,
  getAllQiuDao,
  findQiuDaoById,
  updateQiuDao,
  removeQiuDao,
  getQiudaosPaginated
};
