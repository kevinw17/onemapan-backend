import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";

import registerController from "./register/register.controller";
import locationController from "./profile/location/location.controller";
import qiudaoController from "./profile/qiudao/qiudao.controller";
import userController from "./profile/user/user.controller";
import loginController from "./login/login.controller";
import exportController from "./export/export.controller";
import importController from "./import/import.controller";
import dianchuanshiController from "./dianchuanshi/dianchuanshi.controller";
import fotangController from "./fotang/fotang.controller";
import eventController from "./event/event.controller";
import qs from "qs";

dotenv.config();
const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next) => {
    req.queryParsed = qs.parse(req.query as any);
    next();
});

app.get("/", (req: Request, res: Response) => {
  res.send("OneMapan Backend");
});

app.use("/register", registerController);
app.use("/profile/location", locationController);
app.use("/profile/qiudao", qiudaoController);
app.use("/profile/user", userController);
app.use("/login", loginController);
app.use("/export", exportController);
app.use("/import", importController);
app.use("/dianchuanshi", dianchuanshiController);
app.use("/fotang", fotangController);
app.use("/event", eventController);

// Listener
app.listen(PORT, () => {
  console.log(`OneMapan backend running on port: ${PORT}`);
});
