const prisma = require("../../db");

const getOrCreateLocation = async (data) => {
  const existing = await prisma.location.findFirst({ where: data });

  if (existing) return existing;
  
  return await prisma.location.create({ data });
};

const findAllLocations = async () => {
  return await prisma.location.findMany();
};

const findLocationById = async (id) => {
  return await prisma.location.findUnique({
    where: { location_id: id },
  });
};

const updateLocation = async (id, data) => {
  return await prisma.location.update({
    where: { location_id: id },
    data,
  });
};

const removeLocation = async (id) => {
  return await prisma.location.delete({
    where: { location_id: id },
  });
};

module.exports = {
  getOrCreateLocation,
  findAllLocations,
  findLocationById,
  updateLocation,
  removeLocation
};
