import prisma from "../../db";
import { Location } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const getLocalityId = async ({
  name,
  districtName,
  cityName,
  provinceName,
}: {
  name?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
}): Promise<number> => {
  if (!name || !districtName || !cityName || !provinceName)
    throw new Error("Nama kelurahan/kecamatan/kota/provinsi tidak lengkap");

  const locality = await prisma.locality.findFirst({
    where: {
      name: { equals: name.trim(), mode: "insensitive" },
      district: {
        name: { equals: districtName.trim(), mode: "insensitive" },
        city: {
          name: { equals: cityName.trim(), mode: "insensitive" },
          province: {
            name: { equals: provinceName.trim(), mode: "insensitive" },
          },
        },
      },
    },
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
  });

  if (!locality) {
    console.error("[getLocalityId] Tidak ditemukan:", {
    name,
    districtName,
    cityName,
    provinceName,
  });
  throw new Error(
    `Locality tidak ditemukan untuk ${name}, ${districtName}, ${cityName}, ${provinceName}`
  );
  }

  return locality.id;
};

export const getOrCreateLocation = async (data: {
  location_name: string;
  location_mandarin_name?: string;
  latitude?: number;
  longitude?: number;
  street?: string;
  postal_code?: string;
  localityId: number;
}): Promise<Location> => {
  const searchData: Prisma.LocationWhereInput = {
    location_name: data.location_name,
    location_mandarin_name: data.location_mandarin_name,
    street: data.street,
    postal_code: data.postal_code,
    locality: {
      is: {
        id: Number(data.localityId),
      },
    },
  };

  const existing = await prisma.location.findFirst({ where: searchData });
  if (existing) return existing;

  return await prisma.location.create({
    data: {
      location_name: data.location_name,
      location_mandarin_name: data.location_mandarin_name,
      latitude: data.latitude,
      longitude: data.longitude,
      street: data.street,
      postal_code: data.postal_code,
      locality: {
        connect: { id: data.localityId },
      },
    },
  });
};

export const findAllLocations = async (): Promise<Location[]> => {
  return await prisma.location.findMany({
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
  });
};

export const findLocationById = async (id: number): Promise<Location | null> => {
  return await prisma.location.findUnique({
    where: { location_id: id },
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
  });
};

export const updateLocation = async (
  id: number,
  data: {
    location_name?: string;
    location_mandarin_name?: string;
    latitude?: number;
    longitude?: number;
    street?: string;
    postal_code?: string;
    localityId?: number | string;
  }
): Promise<Location> => {
  const {
    location_name,
    location_mandarin_name,
    latitude,
    longitude,
    street,
    postal_code,
    localityId,
  } = data;

  const parsedLocalityId =
    localityId !== undefined ? Number(localityId) : undefined;

  const updateData: Prisma.LocationUpdateInput = {
    ...(location_name && { location_name }),
    ...(location_mandarin_name && { location_mandarin_name }),
    ...(latitude !== undefined && { latitude }),
    ...(longitude !== undefined && { longitude }),
    ...(street && { street }),
    ...(postal_code && { postal_code }),
    ...(parsedLocalityId !== undefined && {
      locality: {
        connect: { id: parsedLocalityId },
      },
    }),
  };

  return await prisma.location.update({
    where: { location_id: id },
    data: updateData,
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
  });
};

export const removeLocation = async (id: number): Promise<Location> => {
  return await prisma.location.delete({
    where: { location_id: id },
  });
};

export const getAllProvinces = async () => {
  return prisma.province.findMany({ orderBy: { name: "asc" } });
};

export const getCitiesByProvince = async (provinceId: number) => {
  return prisma.city.findMany({
    where: { provinceId },
    orderBy: { name: "asc" },
  });
};

export const getDistrictsByCity = async (cityId: number) => {
  return prisma.district.findMany({
    where: { cityId },
    orderBy: { name: "asc" },
  });
};

export const getLocalitiesByDistrict = async (districtId: number) => {
  return prisma.locality.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
  });
};
