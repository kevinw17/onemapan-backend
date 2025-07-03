const express = require("express");
const router = express.Router();
const { loginUser } = require("./login.service");

router.post("/", async (req, res) => {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

module.exports = router;
