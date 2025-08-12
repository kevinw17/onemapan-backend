import prisma from "../../db";
import { Prisma, SpiritualStatus, User, UserCredential } from "@prisma/client";

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

export const findUserById = async (
  id: number
): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: { user_info_id: id },
    include: {
      qiudao: {
        include: {
          qiu_dao_location: true,
        },
      },
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
      userCredential: true,
      spiritualUser: true,
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
  skip: number;
  limit: number;
  search: string;
  searchField: string;
  spiritualStatus?: string;
  job_name?: string | string[];
  last_education_level?: string | string[];
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
}: PaginatedUserOptions): Promise<{ data: User[]; total: number }> => {
  const nestedFields: Record<string, Prisma.UserWhereInput> = {
    "domicile_location.locality": buildLocationFilter("domicile_location", "locality", search),
    "id_card_location.locality": buildLocationFilter("id_card_location", "locality", search),
    "domicile_location.district": buildLocationFilter("domicile_location", "district", search),
    "id_card_location.district": buildLocationFilter("id_card_location", "district", search),
    "domicile_location.city": buildLocationFilter("domicile_location", "city", search),
    "id_card_location.city": buildLocationFilter("id_card_location", "city", search),
    "domicile_location.province": buildLocationFilter("domicile_location", "province", search),
    "id_card_location.province": buildLocationFilter("id_card_location", "province", search),
  };

  let where: Prisma.UserWhereInput;

  if (nestedFields[searchField]) {
    where = nestedFields[searchField];
  } else {
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

    const field = searchableFields.includes(searchField)
      ? (searchField as keyof Prisma.StringFilter)
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

  console.log("Combined Filter:", JSON.stringify(combinedFilter, null, 2));
  if (Object.keys(combinedFilter).length > 0) {
      filters.push(combinedFilter);
  }

  if (spiritualStatus) {
    where = {
      AND: [
        where,
        {
          spiritualUser: {
            spiritual_status: {
              equals: spiritualStatus as SpiritualStatus,
            },
          },
        },
      ],
    };
  }

  where = filters.length > 1 ? { AND: filters } : where;
  console.log("Where Clause:", JSON.stringify(where, null, 2));

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
