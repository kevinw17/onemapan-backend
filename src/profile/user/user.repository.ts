import prisma from "../../db";
import { BloodType, Gender, Prisma, SpiritualStatus, User, UserCredential, Korwil, Role, UserRole } from "@prisma/client";

export const findCredential = async (
  user_credential: number
): Promise<UserCredential | null> => {
  return await prisma.userCredential.findUnique({
    where: { user_credential },
  });
};

export const createUser = async (
  data: Prisma.UserCreateInput
): Promise<User> => {
  return await prisma.user.create({ data });
};

export const getAllUsers = async (): Promise<User[]> => {
  return await prisma.user.findMany({
    include: {
      id_card_location: {
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
      domicile_location: {
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
      spiritualUser: true,
    },
  });
};

type UserWithIncludes = User & {
  qiudao?: { qiu_dao_location?: { area: Korwil } };
  id_card_location?: any;
  domicile_location?: any;
  userCredential?: any;
  spiritualUser?: any;
  userRoles?: (UserRole & { role: Role })[];
};

export const findUserById = async (id: number): Promise<UserWithIncludes | null> => {
  return await prisma.user.findUnique({
    where: { user_info_id: id },
    include: {
      qiudao: { include: { qiu_dao_location: true } },
      id_card_location: { include: { locality: { include: { district: { include: { city: { include: { province: true } } } } } } } },
      domicile_location: { include: { locality: { include: { district: { include: { city: { include: { province: true } } } } } } } },
      userCredential: true,
      spiritualUser: true,
      userRoles: { include: { role: true } },
    },
  });
};

export const updateUser = async (
  id: number,
  updateData: Prisma.UserUpdateInput
): Promise<User> => {
  const {
    full_name,
    mandarin_name,
    is_qing_kou,
    phone_number,
    gender,
    blood_type,
    place_of_birth,
    date_of_birth,
    id_card_number,
    email,
    marital_status,
    last_education_level,
    education_major,
    job_name,
    id_card_location,
    domicile_location,
  } = updateData;

  return await prisma.user.update({
    where: { user_info_id: id },
    data: {
      full_name,
      mandarin_name,
      is_qing_kou,
      phone_number,
      gender,
      blood_type,
      place_of_birth,
      date_of_birth,
      id_card_number,
      email,
      marital_status,
      last_education_level,
      education_major,
      job_name,
      id_card_location,
      domicile_location,
    },
  });
};

export const updateUserWithSpiritualStatus = async (
  id: number,
  updateData: Prisma.UserUpdateInput,
  newSpiritualStatus: SpiritualStatus
): Promise<User> => {
  return await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { user_info_id: id },
      data: updateData,
    });

    await tx.spiritualUser.upsert({
      where: { userId: id },
      update: {
        spiritual_status: newSpiritualStatus,
      },
      create: {
        userId: id,
        spiritual_status: newSpiritualStatus,
      },
    });

    return updatedUser;
  });
};

export const deleteUser = async (id: number): Promise<User> => {
  return await prisma.$transaction(async (tx) => {
    await tx.spiritualUser.deleteMany({
      where: { userId: id },
    });

    return await tx.user.delete({
      where: { user_info_id: id },
    });
  });
};

interface PaginatedUserOptions {
  skip?: number;
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

function buildLocationFilter(
  type: "domicile_location" | "id_card_location",
  level: "locality" | "district" | "city" | "province",
  search: string
): Prisma.UserWhereInput {
  const base = {
    contains: search,
    mode: "insensitive" as const,
  };

  if (level === "locality") {
    return {
      [type]: {
        locality: {
          name: base,
        },
      },
    };
  }

  if (level === "district") {
    return {
      [type]: {
        locality: {
          district: {
            name: base,
          },
        },
      },
    };
  }

  if (level === "city") {
    return {
      [type]: {
        locality: {
          district: {
            city: {
              name: base,
            },
          },
        },
      },
    };
  }

  if (level === "province") {
    return {
      [type]: {
        locality: {
          district: {
            city: {
              province: {
                name: base,
              },
            },
          },
        },
      },
    };
  }

  return {};
}

export const getUsersPaginated = async ({
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
}: PaginatedUserOptions): Promise<{ data: User[]; total: number }> => {
  const nestedFields: Record<string, Prisma.UserWhereInput> = {
    "domicile_location.locality": buildLocationFilter("domicile_location", "locality", search ?? ""),
    "id_card_location.locality": buildLocationFilter("id_card_location", "locality", search ?? ""),
    "domicile_location.district": buildLocationFilter("domicile_location", "district", search ?? ""),
    "id_card_location.district": buildLocationFilter("id_card_location", "district", search ?? ""),
    "domicile_location.city": buildLocationFilter("domicile_location", "city", search ?? ""),
    "id_card_location.city": buildLocationFilter("id_card_location", "city", search ?? ""),
    "domicile_location.province": buildLocationFilter("domicile_location", "province", search ?? ""),
    "id_card_location.province": buildLocationFilter("id_card_location", "province", search ?? ""),
  };

  let where: Prisma.UserWhereInput = {};

  const effectiveSearchField = searchField ?? "full_name";

  if (nestedFields[effectiveSearchField] && search) {
    where = nestedFields[effectiveSearchField];
  } else if (search) {
    const searchableFields = [
      "full_name",
      "mandarin_name",
      "place_of_birth",
      "id_card_number",
      "phone_number",
      "email",
      "last_education_level",
      "education_major",
      "job_name",
    ];

    const field = searchableFields.includes(effectiveSearchField)
      ? (effectiveSearchField as keyof Prisma.StringFilter)
      : "full_name";

    where = {
      [field]: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  const filters: Prisma.UserWhereInput[] = [where];

  const combinedFilter: Prisma.UserWhereInput = {};

  if (userId) {
    combinedFilter.user_info_id = { equals: userId };
  }

  if (job_name) {
    if (Array.isArray(job_name) && job_name.length > 0) {
      combinedFilter.job_name = { in: job_name.map(val => val as string) };
    } else if (typeof job_name === "string" && job_name.trim() !== "") {
      combinedFilter.job_name = { equals: job_name };
    }
  }
  if (last_education_level) {
    if (Array.isArray(last_education_level) && last_education_level.length > 0) {
      combinedFilter.last_education_level = { in: last_education_level.map(val => val as string) };
    } else if (typeof last_education_level === "string" && last_education_level.trim() !== "") {
      combinedFilter.last_education_level = { equals: last_education_level };
    }
  }
  if (spiritualStatus) {
    if (Array.isArray(spiritualStatus) && spiritualStatus.length > 0) {
      combinedFilter.spiritualUser = {
        spiritual_status: { in: spiritualStatus.map(val => val as SpiritualStatus) },
      };
    } else if (typeof spiritualStatus === "string" && spiritualStatus.trim() !== "") {
      combinedFilter.spiritualUser = {
        spiritual_status: { equals: spiritualStatus as SpiritualStatus },
      };
    }
  }
  if (is_qing_kou) {
    if (Array.isArray(is_qing_kou) && is_qing_kou.length > 0) {
      combinedFilter.is_qing_kou = { equals: is_qing_kou[0] === "true" };
    } else if (typeof is_qing_kou === "string" && is_qing_kou.trim() !== "") {
      combinedFilter.is_qing_kou = { equals: is_qing_kou === "true" };
    }
  }
  if (gender) {
    if (Array.isArray(gender) && gender.length > 0) {
      combinedFilter.gender = { in: gender.map(val => val as Gender) };
    } else if (typeof gender === "string" && gender.trim() !== "") {
      combinedFilter.gender = { equals: gender as Gender };
    }
  }
  if (blood_type) {
    if (Array.isArray(blood_type) && blood_type.length > 0) {
      combinedFilter.blood_type = { in: blood_type.map(val => val as BloodType) };
    } else if (typeof blood_type === "string" && blood_type.trim() !== "") {
      combinedFilter.blood_type = { equals: blood_type as BloodType };
    }
  }
  if (userArea) {
    combinedFilter.qiudao = {
      qiu_dao_location: {
        area: { equals: userArea },
      },
    };
  }

  console.log("Combined Filter:", JSON.stringify(combinedFilter, null, 2));
  if (Object.keys(combinedFilter).length > 0) {
    filters.push(combinedFilter);
  }

  where = filters.length > 1 ? { AND: filters } : filters[0] || {};

  const locationInclude = {
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
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        qiudao: { include: { qiu_dao_location: true } },
        id_card_location: { include: locationInclude },
        domicile_location: { include: locationInclude },
        userCredential: true,
        spiritualUser: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total };
};