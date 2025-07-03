const express = require("express");
const router = express.Router();
const {
  getIdCardLocation,
  getDomicileLocation,
  getQiudaoLocation,
  getAllLocations, 
  getLocationById,
  updateLocationById,
  deleteLocationById
} = require("./location.service");

router.post("/id-card", async (req, res) => {
  try {
    const location = await getIdCardLocation(req.body);

    res.status(201).json({ id_card_location_id: location.location_id });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post("/domicile", async (req, res) => {
  try {
    const location = await getDomicileLocation(req.body);

    res.status(201).json({ domicile_location_id: location.location_id });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post("/qiudao", async (req, res) => {
  try {
    const location = await getQiudaoLocation(req.body);
    
    res.status(201).json({ qiu_dao_location_id: location.location_id });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.get("/", async (req, res) => {
  try {
    const locations = await getAllLocations();

    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const location = await getLocationById(id);

    if (!location) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }

    res.status(200).json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedLocation = await updateLocationById(id, req.body);

    if (!updatedLocation) {
      return res.status(404).json({ message: "Data lokasi tidak ditemukan" });
    }

    res.status(200).json({
      message: "Data lokasi berhasil diperbarui",
      data: updatedLocation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await deleteLocationById(id);

    res.status(200).json({ message: "Data lokasi berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
