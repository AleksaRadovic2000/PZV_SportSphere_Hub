import fs from "fs";
import express from "express";
import SportModel from "../models/sport";
import UserModel from "../models/user";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const removeUploadedFile = (file?: Express.Multer.File) => {
  if (file) {
    fs.unlink(file.path, () => undefined);
  }
};

export class UserController {
  getPending = (_req: express.Request, res: express.Response) => {
    UserModel.find({ status: "pending" })
      .sort({ role: 1, username: 1 })
      .then((users) => {
        res.json(users);
      })
      .catch((error) => {
        console.error("Failed to load registration requests:", error);
        res.status(500).json({ message: "Failed to load registration requests" });
      });
  };

  approveUser = (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!username) {
      res.status(400).json({ message: "Username is required" });
      return;
    }

    username = username.trim();

    UserModel.findOneAndUpdate(
      { username, status: "pending" },
      { status: "active" },
      { new: true },
    )
      .then((user) => {
        if (!user) {
          res.status(404).json({ message: "Pending registration request was not found" });
          return;
        }

        res.json({ message: "Registration request approved" });
      })
      .catch((error) => {
        console.error("Registration approval failed:", error);
        res.status(500).json({ message: "Registration approval failed" });
      });
  };

  rejectUser = (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!username) {
      res.status(400).json({ message: "Username is required" });
      return;
    }

    username = username.trim();

    UserModel.findOneAndUpdate(
      { username, status: "pending" },
      { status: "rejected" },
      { new: true },
    )
      .then((user) => {
        if (!user) {
          res.status(404).json({ message: "Pending registration request was not found" });
          return;
        }

        res.json({ message: "Registration request rejected" });
      })
      .catch((error) => {
        console.error("Registration rejection failed:", error);
        res.status(500).json({ message: "Registration rejection failed" });
      });
  };

  adminUpdate = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let phone = req.body.phone;
    let email = req.body.email;

    if (!username || !firstName || !lastName || !phone || !email) {
      res.status(400).json({ message: "All required fields must be provided" });
      return;
    }

    username = username.trim();
    firstName = firstName.trim();
    lastName = lastName.trim();
    phone = phone.trim();
    email = email.trim().toLowerCase();

    if (!emailPattern.test(email)) {
      res.status(400).json({ message: "Email address is not valid" });
      return;
    }

    try {
      const user = await UserModel.findOne({ username });

      if (!user) {
        res.status(404).json({ message: "User was not found" });
        return;
      }

      const userWithSameEmail = await UserModel.findOne({
        email,
        username: { $ne: username },
      });

      if (userWithSameEmail) {
        res.status(409).json({ message: "Email is already in use" });
        return;
      }

      const updatedUser = await UserModel.findOneAndUpdate(
        { username },
        { firstName, lastName, phone, email },
        { new: true, runValidators: true },
      );

      res.json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Admin user update failed:", error);
      res.status(500).json({ message: "User update failed" });
    }
  };

  deleteUser = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!username) {
      res.status(400).json({ message: "Username is required" });
      return;
    }

    username = username.trim();

    try {
      const user = await UserModel.findOne({ username });

      if (!user) {
        res.status(404).json({ message: "User was not found" });
        return;
      }

      if (user.role === "admin") {
        const adminCount = await UserModel.countDocuments({ role: "admin" });

        if (adminCount <= 1) {
          res.status(400).json({ message: "The only administrator cannot be deleted" });
          return;
        }
      }

      await UserModel.deleteOne({ username });
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion failed:", error);
      res.status(500).json({ message: "User deletion failed" });
    }
  };

  getAll = (_req: express.Request, res: express.Response) => {
    UserModel.find({})
      .sort({ role: 1, username: 1 })
      .then((users) => {
        res.json(users);
      })
      .catch((error) => {
        console.error("Failed to load users:", error);
        res.status(500).json({ message: "Failed to load users" });
      });
  };

  getProfile = (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    UserModel.findOne({ username })
      .then((user) => {
        if (!user) {
          res.status(404).json({ message: "User was not found" });
          return;
        }

        res.json(user);
      })
      .catch((error) => {
        console.error("Failed to load profile:", error);
        res.status(500).json({ message: "Failed to load profile" });
      });
  };

  updateProfile = async (req: express.Request, res: express.Response) => {
    let profileData = req.body.user;
    let data;

    if (!profileData) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Profile data is required" });
      return;
    }

    try {
      data = JSON.parse(profileData);
    } catch {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Profile data is not valid JSON" });
      return;
    }

    let username = data.username;
    let firstName = data.firstName;
    let lastName = data.lastName;
    let phone = data.phone;
    let email = data.email;

    if (!username || !firstName || !lastName || !phone || !email) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "All required fields must be provided" });
      return;
    }

    username = username.trim();
    firstName = firstName.trim();
    lastName = lastName.trim();
    phone = phone.trim();
    email = email.trim().toLowerCase();

    if (!emailPattern.test(email)) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Email address is not valid" });
      return;
    }

    try {
      const user = await UserModel.findOne({ username });

      if (!user) {
        removeUploadedFile(req.file);
        res.status(404).json({ message: "User was not found" });
        return;
      }

      const userWithSameEmail = await UserModel.findOne({
        email,
        username: { $ne: username },
      });

      if (userWithSameEmail) {
        removeUploadedFile(req.file);
        res.status(409).json({ message: "Email is already in use" });
        return;
      }

      let favouriteSports = user.favouriteSports;

      if (user.role === "athlete") {
        favouriteSports = Array.isArray(data.favouriteSports) ? data.favouriteSports : [];

        const distinctSports = [...new Set(favouriteSports)];

        if (distinctSports.length !== favouriteSports.length || favouriteSports.length > 5) {
          removeUploadedFile(req.file);
          res.status(400).json({ message: "Select up to five different sports" });
          return;
        }

        if (favouriteSports.length > 0) {
          const sportsInDatabase = await SportModel.countDocuments({
            name: { $in: favouriteSports },
          });

          if (sportsInDatabase !== favouriteSports.length) {
            removeUploadedFile(req.file);
            res.status(400).json({ message: "One or more selected sports do not exist" });
            return;
          }
        }
      }

      let updateData: any = {
        firstName,
        lastName,
        phone,
        email,
      };

      if (user.role === "athlete") {
        updateData.favouriteSports = favouriteSports;
      }

      if (req.file) {
        updateData.profileImage = `uploads/profiles/${req.file.filename}`;
      }

      const updatedUser = await UserModel.findOneAndUpdate(
        { username },
        updateData,
        { new: true, runValidators: true },
      );

      res.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      removeUploadedFile(req.file);
      console.error("Profile update failed:", error);
      res.status(500).json({ message: "Profile update failed" });
    }
  };
}
