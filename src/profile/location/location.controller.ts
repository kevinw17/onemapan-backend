import { Router, Request, Response } from "express";
import {
  getIdCardLocation,
  getDomicileLocation,
  getQiudaoLocation,
  getAllLocations,
  getLocationById,
  updateLocationById,
  deleteLocationById,
  LocationInput,
  fetchProvinces,
  fetchCities,
  fetchDistricts,
  fetchLocalities,
} from "./location.service";
import prisma from "../../db";

const router = Router();

router.post("/id-card", async (req: Request, res: Response) => {
  try {
    const location = await getIdCardLocation(req.body as LocationInput);
    res.status(201).json({ id_card_location_id: location.location_id });
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.post("/domicile", async (req: Request, res: Response) => {
  try {
    const location = await getDomicileLocation(req.body as LocationInput);
    res.status(201).json({ domicile_location_id: location.location_id });
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.post("/qiudao", async (req: Request, res: Response) => {
  try {
    const location = await getQiudaoLocation(req.body as LocationInput);
    res.status(201).json({ qiu_dao_location_id: location.location_id });
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const locations = await getAllLocations();
    res.status(200).json(locations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/provinces", async (_req: Request, res: Response) => {
  try {
    const provinces = await fetchProvinces();
    res.json(provinces);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/cities", (req, res) => {
  void (async () => {
    const provinceId = parseInt(req.query.provinceId as string);

    try {
      const cities = await fetchCities(provinceId);
      res.json(cities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })();
});

router.get("/districts", (req, res) => {
  void (async () => {
    const cityId = parseInt(req.query.cityId as string);

    try {
      const districts = await fetchDistricts(cityId);
      res.json(districts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })();
});

router.get("/localities", (req, res) => {
  void (async () => {
    const districtId = parseInt(req.query.districtId as string);

    try {
      const localities = await fetchLocalities(districtId);
      res.json(localities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })();
});

router.get("/locality/:id", async (req, res) => {
  void (async () => {
    try {
      const id = parseInt(req.params.id);
      const locality = await prisma.locality.findUnique({ where: { id } });
  
      if (!locality) return res.status(404).json({ message: "Locality tidak ditemukan" });
      res.json(locality);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })
});

router.get("/district/:id", async (req, res) => {
  void (async () => {
    try {
      const id = parseInt(req.params.id);
      const district = await prisma.district.findUnique({ where: { id } });
  
      if (!district) return res.status(404).json({ message: "District tidak ditemukan" });
      res.json(district);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })
});

router.get("/city/:id", async (req, res) => {
  void (async () => {
    try {
      const id = parseInt(req.params.id);
      const city = await prisma.city.findUnique({ where: { id } });
  
      if (!city) return res.status(404).json({ message: "City tidak ditemukan" });
      res.json(city);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })
});

router.get("/:id", async (req: Request, res: Response) => {
  void (async () => {
    const id = parseInt(req.params.id);
    const location = await getLocationById(id);
  
    if (!location) return res.status(404).json({ message: "Lokasi tidak ditemukan" });
  
    res.status(200).json(location);
  })
});

router.patch("/:id", async (req, res) => {
  void (async () => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;
  
      const updatedLocation = await updateLocationById(id, body);
  
      if (!updatedLocation) {
        return res.status(404).json({ message: "Data lokasi tidak ditemukan" });
      }
  
      res.status(200).json({
        message: "Data lokasi berhasil diperbarui",
        data: updatedLocation,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  })();
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteLocationById(id);
    res.status(200).json({ message: "Data lokasi berhasil dihapus" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
