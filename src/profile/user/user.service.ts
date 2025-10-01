import prisma from "../../db";
import { UserWithRelations } from "../../types/user";
import {
  findCredential,
  createUser,
  findUserById,
  updateUser,
  deleteUser,
  getUsersPaginated,
  updateUserWithSpiritualStatus,
} from "./user.repository";
import { Prisma, User, Gender, BloodType, MaritalStatus, SpiritualStatus, Korwil, UserRole, Role } from "@prisma/client";

interface RegisterUserInput {
  user_credential?: number;
  qiu_dao_id: number | string;
  domicile_location_id: number | string;
  id_card_location_id: number | string;
  full_name: string;
  mandarin_name?: string;
  is_qing_kou: boolean;
  gender: string;
  blood_type?: string;
  place_of_birth: string;
  date_of_birth: string;
  date_of_death?: string;
  id_card_number?: string;
  phone_number: string;
  email?: string;
  marital_status?: string;
  last_education_level?: string;
  education_major?: string;
  job_name?: string;
  spiritual_status?: string;
}

interface UpdateUserInput extends Omit<Prisma.UserUpdateInput, "spiritual_status"> {
  spiritual_status?: string;
}

const assertEnumValue = <T extends Record<string, string>>(enumObj: T, value: string, field: string): T[keyof T] => {
  if (!Object.values(enumObj).includes(value as T[keyof T])) {
    throw new Error(`Nilai '${value}' tidak valid untuk ${field}`);
  }
  return value as T[keyof T];
}

export const registerUser = async (body: RegisterUserInput): Promise<void> => {
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
    spiritual_status,
  } = body;

  if (
    !qiu_dao_id ||
    !full_name ||
    typeof is_qing_kou !== "boolean" ||
    !gender ||
    !place_of_birth ||
    !date_of_birth ||
    !phone_number ||
    !id_card_location_id ||
    !domicile_location_id
  ) {
    throw new Error("Terdapat field wajib yang belum diisi");
  }

  let connectCredential: Prisma.UserCreateInput["userCredential"] | undefined = undefined;

  if (user_credential) {
    const credential = await findCredential(user_credential);
    if (!credential) {
      throw new Error("User Credential tidak ditemukan");
    }

    connectCredential = {
      connect: { user_credential },
    };
  }

  const user = await createUser({
    qiudao: {
      connect: { qiu_dao_id: parseInt(qiu_dao_id as string) },
    },
    full_name,
    mandarin_name,
    is_qing_kou,
    gender: assertEnumValue(Gender, gender, "gender"),
    blood_type: blood_type ? assertEnumValue(BloodType, blood_type, "blood_type") : undefined,
    place_of_birth,
    date_of_birth: new Date(date_of_birth),
    date_of_death: date_of_death ? new Date(date_of_death) : null,
    id_card_number,
    phone_number,
    email,
    marital_status: marital_status ? assertEnumValue(MaritalStatus, marital_status, "marital_status") : undefined,
    last_education_level,
    education_major,
    job_name,
    id_card_location: {
      connect: { location_id: parseInt(id_card_location_id as string) },
    },
    domicile_location: {
      connect: { location_id: parseInt(domicile_location_id as string) },
    },
    ...(connectCredential && { userCredential: connectCredential }),
  });

  if (spiritual_status) {
    const status = assertEnumValue(
      SpiritualStatus,
      spiritual_status,
      "spiritual_status"
    );

    await prisma.spiritualUser.create({
      data: {
        userId: user.user_info_id,
        spiritual_status: status,
      },
    });
  }
};

interface FetchAllUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  spiritualStatus?: string | string[];
  job_name?: string | string[];
  last_education_level?: string | string[];
  is_qing_kou?: string | string[];
  gender?: string | string[];
  blood_type?: string | string[];
  userArea?: Korwil;
  userId?: number;
}

export const fetchAllUsers = async ({
  page = 1,
  limit = 10,
  search = "",
  searchField = "full_name",
  spiritualStatus,
  job_name,
  last_education_level,
  is_qing_kou,
  gender,
  blood_type,
  userArea,
  userId,
}: FetchAllUsersOptions) => {
  console.log("fetchAllUsers Input:", { page, limit, search, searchField, userArea, userId });
  const skip = (page - 1) * limit;
  const result = await getUsersPaginated({
    skip,
    limit,
    search,
    searchField,
    spiritualStatus,
    job_name,
    last_education_level,
    is_qing_kou,
    gender,
    blood_type,
    userArea,
    userId,
  });
  console.log("fetchAllUsers Result:", result);
  return result;
};

export const getUserById = async (id: number): Promise<UserWithRelations | null> => {
  const user = await findUserById(id);
  if (!user) return null;

  return {
    ...user,
    role: user.userRoles?.[0]?.role.name || null,
  };
};

export const updateUserById = async (
  id: number,
  updateData: UpdateUserInput
): Promise<User> => {
  if (!id || typeof id !== "number") {
    throw new Error("ID user tidak valid");
  }

  const { spiritual_status, ...userUpdateData } = updateData;

  if (spiritual_status && typeof spiritual_status === "string") {
    const status = assertEnumValue(
      SpiritualStatus,
      spiritual_status,
      "spiritual_status"
    );

    return await updateUserWithSpiritualStatus(id, userUpdateData, status);
  }

  return await updateUser(id, updateData);
};

export const deleteUserById = async (id: number): Promise<User> => {
  if (!id || typeof id !== "number") {
    throw new Error("ID user tidak valid");
  }

  return await deleteUser(id);
};

export const updateOwnProfile = async (
  userId: number,
  updateData: UpdateUserInput
): Promise<User> => {
  const allowedFields: UpdateUserInput = {
    full_name: updateData.full_name,
    mandarin_name: updateData.mandarin_name,
    phone_number: updateData.phone_number,
    email: updateData.email,
    last_education_level: updateData.last_education_level,
    education_major: updateData.education_major,
    job_name: updateData.job_name,
  };

  return await updateUserById(userId, allowedFields);
};