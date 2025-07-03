const express = require("express");
const router = express.Router();
const { 
  registerUser, 
  fetchAllUsers, 
  getUserById, 
  updateUserById,
  deleteUserById
} = require("./user.service");

router.post("/", async (req, res) => {
  try {
    await registerUser(req.body);
    
    res.status(201).send("User registered successfully");
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const searchField = req.query.searchField || "full_name";

    const users = await fetchAllUsers({ page, limit, search, searchField });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await updateUserById(parseInt(id), req.body);

    if (!updatedUser) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.status(200).json({ 
      message: "User berhasil diperbarui", 
      data: updatedUser }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const deletedUser = await deleteUserById(userId);

    res.status(200).json({
      message: "User berhasil dihapus",
      deletedUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
