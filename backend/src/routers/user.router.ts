import express from "express";
import { profileImageUpload } from "../middleware/profile-upload";
import { AdminController } from "../controllers/user/admin.controller";
import { AuthController } from "../controllers/user/auth.controller";
import { UserController } from "../controllers/user/user.controller";

const userRouter = express.Router();

userRouter.route("/pending").get((req, res) => {
  new AdminController().getPending(req, res);
});

userRouter.route("/approve").post((req, res) => {
  new AdminController().approveUser(req, res);
});

userRouter.route("/reject").post((req, res) => {
  new AdminController().rejectUser(req, res);
});

userRouter.route("/admin-update").post((req, res) => {
  new AdminController().adminUpdate(req, res);
});

userRouter.route("/delete").post((req, res) => {
  new AdminController().deleteUser(req, res);
});

userRouter.route("/all").get((req, res) => {
  new AdminController().getAll(req, res);
});

userRouter.route("/profile/:username").get((req, res) => {
  new UserController().getProfile(req, res);
});

userRouter
  .route("/update-profile")
  .post(profileImageUpload.single("profileImage"), (req, res) => {
    new UserController().updateProfile(req, res);
  });

userRouter.route("/generate-avatar").post((req, res) => {
  new AuthController().generateAvatar(req, res);
});

userRouter.route("/register").post(profileImageUpload.single("profileImage"), (req, res) => {
  new AuthController().register(req, res);
});

userRouter.route("/login").post((req, res) => {
  new AuthController().login(req, res);
});

userRouter.route("/admin-login").post((req, res) => {
  new AuthController().adminLogin(req, res);
});

userRouter.route("/request-reset").post((req, res) => {
  new AuthController().requestPasswordReset(req, res);
});

userRouter.route("/reset-password").post((req, res) => {
  new AuthController().resetPassword(req, res);
});

export default userRouter;
