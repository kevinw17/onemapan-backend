const express = require("express");
const router = express.Router();
const { 
  registerQiuDao, 
  fetchAllQiudao, 
  getQiuDaoById, 
  updateQiuDaoById, 
  deleteQiuDaoById 
} = require("./qiudao.service");

router.post("/", async (req, res) => {
  try {
    const qiuDao = await registerQiuDao(req.body);
    
    res.status(201).json({ qiu_dao_id: qiuDao.qiu_dao_id });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const searchField = req.query.searchField || "qiu_dao_mandarin_name";

    const qiudaoList = await fetchAllQiudao({ page, limit, search, searchField });

    res.status(200).json(qiudaoList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const qiudao = await getQiuDaoById(id);

    if (!qiudao) {
      return res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
    }

    res.status(200).json(qiudao);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedQiuDao = await updateQiuDaoById(parseInt(id), req.body);

    if (!updatedQiuDao) {
      return res.status(404).json({ message: "Data QiuDao tidak ditemukan" });
    }

    res.status(200).json({ message: "Data QiuDao berhasil diperbarui", data: updatedQiuDao });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await deleteQiuDaoById(id);

    res.status(200).json({ message: "Data QiuDao berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
