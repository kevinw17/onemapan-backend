const prisma = require("../../db");

const findCredential = async (user_credential) => {
  return await prisma.userCredential.findUnique({
    where: { user_credential },
  });
};

const createUser = async (data) => {
  return await prisma.user.create({ data });
};

const getAllUsers = async () => {
  return await prisma.user.findMany({
    include: {
      qiudao: {
        include: {
          qiu_dao_location: true
        }
      },
      id_card_location: true,
      domicile_location: true,
      userCredential: true,
    },
  });
};

const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { user_info_id: id },
    include: {
      qiudao: {
        include: {
          qiu_dao_location: true,
        },
      },
      id_card_location: true,
      domicile_location: true,
      userCredential: true,
    },
  });
};

const updateUser = async (id, updateData) => {
  return await prisma.user.update({
    where: { user_info_id: id },
    data: updateData,
  });
};

const deleteUser = async (id) => {
  return await prisma.user.delete({
    where: { user_info_id: id },
  });
};

const getUsersPaginated = async ({ skip, limit, search, searchField }) => {
  const nestedFields = {
    "domicile_location.city": { domicile_location: { city: { contains: search, mode: "insensitive" } } },
    "id_card_location.city": { id_card_location: { city: { contains: search, mode: "insensitive" } } }
  };
  
  let where;

  if (nestedFields[searchField]) {
    where = nestedFields[searchField];
  } else {
    const searchableFields = [
      "full_name", "mandarin_name", "place_of_birth",
      "id_card_number", "phone_number", "email",
      "last_education_level", "education_major", "job_name"
    ];

    const field = searchableFields.includes(searchField) ? searchField : "full_name";
    where = {
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        qiudao: { include: { qiu_dao_location: true } },
        id_card_location: true,
        domicile_location: true,
        userCredential: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total };
};

module.exports = {
  findCredential,
  createUser,
  getAllUsers,
  findUserById,
  updateUser,
  deleteUser,
  getUsersPaginated
};
