import mongoose from "mongoose";

const Schema = mongoose.Schema;

let PasswordResetToken = new Schema(
  {
    username: {
      type: String,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

export default mongoose.model(
  "PasswordResetTokenModel",
  PasswordResetToken,
  "passwordResetTokens",
);
