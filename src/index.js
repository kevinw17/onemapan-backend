const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const registerController = require("./register/register.controller");
const locationController = require("./profile/location/location.controller");
const qiudaoController = require("./profile/qiudao/qiudao.controller");
const userController = require("./profile/user/user.controller");
const loginController = require("./login/login.controller");
const exportController = require("./export/export.controller");
const importController = require("./import/import.controller");

const app = express();

dotenv.config();

const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("OneMapan Backend");
});

app.use("/register", registerController);
app.use("/profile/location", locationController);
app.use("/profile/qiudao", qiudaoController);
app.use("/profile/user", userController);
app.use("/login", loginController);
app.use("/export", exportController);
app.use("/import", importController);

app.listen(PORT, () => {
  console.log("OneMapan backend running on port: " + PORT);
});