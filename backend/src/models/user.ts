import mongoose from "mongoose";

const Schema = mongoose.Schema;

let User = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      required: true,
      default: "uploads/profiles/default-avatar.png",
    },
    role: {
      type: String,
      enum: ["athlete", "employee", "admin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      required: true,
      default: "pending",
    },
    favouriteSports: {
      type: [String],
      default: [],
      validate: {
        validator: (sports: string[]) => sports.length <= 5,
        message: "Korisnik moze da izabere najvise pet sportova",
      },
    },
    companyName: {
      type: String,
      trim: true,
    },
    companyAddress: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("UserModel", User, "users");
