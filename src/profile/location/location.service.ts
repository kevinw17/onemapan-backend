import {
  getOrCreateLocation,
  findAllLocations,
  findLocationById,
  updateLocation,
  removeLocation,
  getAllProvinces,
  getCitiesByProvince,
  getDistrictsByCity,
  getLocalitiesByDistrict,
} from "./location.repository";
import { Location, Korwil } from "@prisma/client";

export type LocationInput = {
  location_name: string;
  location_mandarin_name?: string;
  latitude?: number;
  longitude?: number;
  area: Korwil;
  street?: string;
  postal_code?: string;
  localityId: number;
};

export const getIdCardLocation = async (
  data: LocationInput
): Promise<Location> => {
  return await getOrCreateLocation(data);
};

export const getDomicileLocation = async (
  data: LocationInput
): Promise<Location> => {
  return await getOrCreateLocation(data);
};

export const getAllLocations = async (): Promise<Location[]> => {
  return await findAllLocations();
};

export const getLocationById = async (
  id: number
): Promise<Location | null> => {
  return await findLocationById(id);
};

export const updateLocationById = async (
  id: number,
  updateData: {
    location_name?: string;
    location_mandarin_name?: string;
    latitude?: number;
    longitude?: number;
    street?: string;
    postal_code?: string;
    localityId?: number;
  }
): Promise<Location> => {
  if (!id || typeof id !== "number") {
    throw new Error("ID lokasi tidak valid");
  }

  return await updateLocation(id, updateData);
};

export const deleteLocationById = async (id: number): Promise<Location> => {
  if (!id || typeof id !== "number") {
    throw new Error("ID lokasi tidak valid");
  }
  return await removeLocation(id);
};

export const fetchProvinces = async () => getAllProvinces();

export const fetchCities = async (provinceId: number) =>
  getCitiesByProvince(provinceId);

export const fetchDistricts = async (cityId: number) =>
  getDistrictsByCity(cityId);

export const fetchLocalities = async (districtId: number) =>
  getLocalitiesByDistrict(districtId);

