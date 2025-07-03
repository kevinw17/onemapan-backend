const { 
  getOrCreateLocation, 
  findAllLocations, 
  findLocationById,
  updateLocation,
  removeLocation
} = require("./location.repository");

const getIdCardLocation = async (data) => {
  return await getOrCreateLocation(data);
};

const getDomicileLocation = async (data) => {
  return await getOrCreateLocation(data);
};

const getQiudaoLocation = async (data) => {
  return await getOrCreateLocation(data);
};

const getAllLocations= async () => {
  return await findAllLocations();
};

const getLocationById = async (id) => {
  return await findLocationById(id);
};

const updateLocationById = async (id, updateData) => {
  if (!id || typeof id !== "number") {
    throw new Error("ID lokasi tidak valid");
  }

  return await updateLocation(id, updateData);
};

const deleteLocationById = async (id) => {
  if (!id || typeof id !== "number") {
    throw new Error("ID lokasi tidak valid");
  }
  return await removeLocation(id);
};

module.exports = {
  getIdCardLocation,
  getDomicileLocation,
  getQiudaoLocation,
  getAllLocations,
  getLocationById,
  updateLocationById,
  deleteLocationById
};
