import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(__dirname, "../../uploads/products");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = file.mimetype === "image/png" ? ".png" : ".jpg";
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

export const productImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(new Error("Slika proizvoda mora biti PNG ili JPG fajl"));
      return;
    }

    callback(null, true);
  },
});
