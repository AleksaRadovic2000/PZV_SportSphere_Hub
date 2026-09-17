import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(__dirname, "../../uploads/facilities");
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

const imageFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  const allowedTypes = ["image/jpeg", "image/png"];

  if (!allowedTypes.includes(file.mimetype)) {
    callback(new Error("Facility images must be PNG or JPG files"));
    return;
  }

  callback(null, true);
};

export const facilityImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: imageFilter,
});

export const facilityJsonUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/json" && !file.originalname.endsWith(".json")) {
      callback(new Error("Select a JSON file"));
      return;
    }

    callback(null, true);
  },
});
