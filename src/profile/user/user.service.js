const { 
  findCredential, 
  createUser,
  findUserById, 
  updateUser,
  deleteUser,
  getUsersPaginated
} = require("./user.repository");

const registerUser = async (body) => {
  const {
    user_credential,
    qiu_dao_id,
    domicile_location_id,
    id_card_location_id,
    full_name,
    mandarin_name,
    is_qing_kou,
    gender,
    blood_type,
    place_of_birth,
    date_of_birth,
    date_of_death,
    id_card_number,
    phone_number,
    email,
    marital_status,
    last_education_level,
    education_major,
    job_name,
  } = body;

  if (
    !qiu_dao_id || !full_name ||
    typeof is_qing_kou !== "boolean" ||
    !gender || !place_of_birth || !date_of_birth || !phone_number ||
    !id_card_location_id || !domicile_location_id
  ) {
    throw new Error("Terdapat field wajib yang belum diisi");
  }

  let connectCredential = undefined;

  if (user_credential) {
    const credential = await findCredential(user_credential);
    if (!credential) {
      throw new Error("User Credential tidak ditemukan");
    }

    connectCredential = {
      connect: { user_credential },
    };
  }

  await createUser({
    qiu_dao_id: parseInt(qiu_dao_id),
    full_name,
    mandarin_name,
    is_qing_kou,
    gender,
    blood_type,
    place_of_birth,
    date_of_birth: new Date(date_of_birth),
    date_of_death: date_of_death ? new Date(date_of_death) : null,
    id_card_number,
    phone_number,
    email,
    marital_status,
    last_education_level,
    education_major,
    job_name,
    domicile_location_id: parseInt(domicile_location_id),
    id_card_location_id: parseInt(id_card_location_id),
    ...(connectCredential && { userCredential: connectCredential })
  });
};

const fetchAllUsers = async ({ page = 1, limit = 10, search = "", searchField = "full_name"}) => {
  const skip = (page - 1) * limit;

  return await getUsersPaginated({ skip, limit, search, searchField });
};

const getUserById = async (id) => {
  return await findUserById(id);
};

const updateUserById = async (id, updateData) => {
  if (!id || typeof id !== "number") {
    throw new Error("ID user tidak valid");
  }

  const updatedUser = await updateUser(id, updateData);
  return updatedUser;
};

const deleteUserById = async (id) => {
  if (!id || typeof id !== "number") {
    throw new Error("ID user tidak valid");
  }

  const deleted = await deleteUser(id);
  return deleted;
};

module.exports = {
  registerUser,
  fetchAllUsers,
  getUserById,
  updateUserById,
  deleteUserById
};
