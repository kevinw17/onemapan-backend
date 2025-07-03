const express = require("express");
const router = express.Router();
const { registerCredential } = require("./register.service");

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;

    await registerCredential(username, password);
    
    res.status(201).send("Username berhasil dibuat");
  } catch (error) {
    res.status(400).send(error.message);
  }
});

module.exports = router;