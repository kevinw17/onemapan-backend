import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
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
import roleController from "./role/role.controller";
import institutionRouter from "./institution/institution.controller";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 2025;

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hapus middleware queryParsed
// app.use((req: Request, res: Response, next: NextFunction) => {
//   req.queryParsed = qs.parse(req.query as any);
//   next();
// });

const uploadPath = path.resolve(__dirname, "../public/uploads");
try {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  fs.accessSync(uploadPath, fs.constants.R_OK | fs.constants.W_OK);
  const files = fs.readdirSync(uploadPath);
} catch (err) {
  console.error("Error setting up uploads directory:", err);
}

app.use("/uploads", (req, res, next) => {
  const filePath = path.join(uploadPath, req.path);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("File not found");
    return;
  }
  next();
}, express.static(uploadPath));
app.use(express.static(path.join(__dirname, "../public")));

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
app.use("/role", roleController);
app.use("/institution", institutionRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(err.statusCode || 500).json({ message: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`OneMapan backend running on port: ${PORT}`);
});