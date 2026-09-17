import express from "express";
import { profileImageUpload } from "../middleware/profile-upload";
import { UserController } from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.route("/generate-avatar").post((req, res) => {
  new UserController().generateAvatar(req, res);
});

userRouter.route("/register").post(profileImageUpload.single("profileImage"), (req, res) => {
  new UserController().register(req, res);
});

userRouter.route("/login").post((req, res) => {
  new UserController().login(req, res);
});

userRouter.route("/admin-login").post((req, res) => {
  new UserController().adminLogin(req, res);
});

userRouter.route("/request-reset").post((req, res) => {
  new UserController().requestPasswordReset(req, res);
});

userRouter.route("/reset-password").post((req, res) => {
  new UserController().resetPassword(req, res);
});

export default userRouter;
