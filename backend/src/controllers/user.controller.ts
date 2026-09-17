import { randomBytes } from "crypto";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";
import { toPng } from "jdenticon";
import PasswordResetTokenModel from "../models/password-reset-token";
import SportModel from "../models/sport";
import UserModel from "../models/user";
import { isPasswordValid } from "../utils/password";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registrationNumberPattern = /^\d{8}$/;
const taxIdPattern = /^[1-9]\d{8}$/;

const removeUploadedFile = (file?: Express.Multer.File) => {
  if (file) {
    fs.unlink(file.path, () => undefined);
  }
};

export class UserController {
  generateAvatar = (req: express.Request, res: express.Response) => {
    let seed = req.body.seed;

    if (!seed) {
      res.status(400).json({ message: "Avatar seed is required" });
      return;
    }

    seed = seed.trim();
    const avatar = toPng(seed, 256, { backColor: "#ffffffff" });
    res.type("png").send(avatar);
  };

  register = async (req: express.Request, res: express.Response) => {
    let registrationData = req.body.user;
    let data;

    if (!registrationData) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Registration data is required" });
      return;
    }

    try {
      data = JSON.parse(registrationData);
    } catch {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Registration data is not valid JSON" });
      return;
    }

    const requiredFields = [
      data.username,
      data.password,
      data.firstName,
      data.lastName,
      data.phone,
      data.email,
      data.role,
    ];

    if (
      requiredFields.some((value) => typeof value !== "string" || !value.trim())
    ) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "All required fields must be provided" });
      return;
    }

    if (data.role !== "athlete" && data.role !== "employee") {
      removeUploadedFile(req.file);
      res
        .status(400)
        .json({ message: "Only athletes and employees can register" });
      return;
    }

    if (!isPasswordValid(data.password)) {
      removeUploadedFile(req.file);
      res.status(400).json({
        message:
          "Password must have 8-12 characters, start with a letter and contain an uppercase letter, a number and a special character",
      });
      return;
    }

    if (!emailPattern.test(data.email)) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Email address is not valid" });
      return;
    }

    const favouriteSports = Array.isArray(data.favouriteSports)
      ? data.favouriteSports
      : [];
    const distinctSports = [...new Set(favouriteSports)];

    if (
      distinctSports.length !== favouriteSports.length ||
      favouriteSports.length > 5
    ) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Select up to five different sports" });
      return;
    }

    try {
      const existingUser = await UserModel.findOne({
        $or: [
          { username: data.username.trim() },
          { email: data.email.trim().toLowerCase() },
        ],
      }).lean();

      if (existingUser) {
        removeUploadedFile(req.file);
        const field =
          existingUser.username === data.username.trim() ? "Username" : "Email";
        res.status(409).json({ message: `${field} is already in use` });
        return;
      }

      if (favouriteSports.length > 0) {
        const sportsInDatabase = await SportModel.countDocuments({
          name: { $in: favouriteSports },
        });

        if (sportsInDatabase !== favouriteSports.length) {
          removeUploadedFile(req.file);
          res
            .status(400)
            .json({ message: "One or more selected sports do not exist" });
          return;
        }
      }

      if (data.role === "employee") {
        const companyFields = [
          data.companyName,
          data.companyAddress,
          data.registrationNumber,
          data.taxId,
        ];

        if (
          companyFields.some(
            (value) => typeof value !== "string" || !value.trim()
          )
        ) {
          removeUploadedFile(req.file);
          res
            .status(400)
            .json({
              message: "All company fields are required for an employee",
            });
          return;
        }

        if (!registrationNumberPattern.test(data.registrationNumber!)) {
          removeUploadedFile(req.file);
          res
            .status(400)
            .json({
              message: "Registration number must contain exactly 8 digits",
            });
          return;
        }

        if (!taxIdPattern.test(data.taxId!)) {
          removeUploadedFile(req.file);
          res.status(400).json({
            message:
              "Tax ID must contain exactly 9 digits and cannot start with zero",
          });
          return;
        }

        const companyEmployees = await UserModel.find({
          role: "employee",
          registrationNumber: data.registrationNumber,
        }).lean();

        if (companyEmployees.length >= 2) {
          removeUploadedFile(req.file);
          res
            .status(409)
            .json({ message: "This company already has two employees" });
          return;
        }

        const companyDataMismatch = companyEmployees.some(
          (employee) =>
            employee.companyName !== data.companyName?.trim() ||
            employee.companyAddress !== data.companyAddress?.trim() ||
            employee.taxId !== data.taxId
        );

        if (companyDataMismatch) {
          removeUploadedFile(req.file);
          res.status(409).json({
            message:
              "Company data must match the existing employee of the same company",
          });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const profileImage = req.file
        ? `uploads/profiles/${req.file.filename}`
        : "uploads/profiles/default-avatar.png";

      const user = await UserModel.create({
        username: data.username.trim(),
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        profileImage,
        role: data.role,
        status: "pending",
        favouriteSports,
        companyName:
          data.role === "employee" ? data.companyName?.trim() : undefined,
        companyAddress:
          data.role === "employee" ? data.companyAddress?.trim() : undefined,
        registrationNumber:
          data.role === "employee" ? data.registrationNumber : undefined,
        taxId: data.role === "employee" ? data.taxId : undefined,
      });

      const userData: any = user.toObject();
      delete userData.passwordHash;

      res.status(201).json({
        message:
          "Registration request created and is waiting for administrator approval",
        user: userData,
      });
    } catch (error) {
      removeUploadedFile(req.file);
      console.error("Registration failed:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  };

  login = async (req: express.Request, res: express.Response) => {
    await this.loginUser(req, res, ["athlete", "employee"]);
  };

  adminLogin = async (req: express.Request, res: express.Response) => {
    await this.loginUser(req, res, ["admin"]);
  };

  requestPasswordReset = async (
    req: express.Request,
    res: express.Response
  ) => {
    let identifier = req.body.identifier;

    if (!identifier) {
      res.status(400).json({ message: "Username or email is required" });
      return;
    }

    identifier = identifier.trim();

    try {
      const user = await UserModel.findOne({
        status: "active",
        $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
      }).lean();

      if (!user) {
        res.status(404).json({ message: "Active user was not found" });
        return;
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await PasswordResetTokenModel.deleteMany({ username: user.username });
      await PasswordResetTokenModel.create({
        username: user.username,
        token,
        expiresAt,
      });

      res.json({
        message: "Password reset link created and valid for 30 minutes",
        resetUrl: `http://localhost:4200/reset-password/${token}`,
      });
    } catch (error) {
      console.error("Password reset request failed:", error);
      res.status(500).json({ message: "Password reset request failed" });
    }
  };

  resetPassword = async (req: express.Request, res: express.Response) => {
    let token = req.body.token;
    let newPassword = req.body.newPassword;

    if (!token || !isPasswordValid(newPassword)) {
      res.status(400).json({
        message:
          "A valid token and password with 8-12 characters, uppercase letter, number and special character are required",
      });
      return;
    }

    token = token.trim();

    try {
      const resetToken = await PasswordResetTokenModel.findOne({
        token,
        expiresAt: { $gt: new Date() },
      }).lean();

      if (!resetToken) {
        res
          .status(400)
          .json({ message: "Password reset link is invalid or expired" });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await UserModel.updateOne(
        { username: resetToken.username },
        { passwordHash }
      );
      await PasswordResetTokenModel.deleteOne({ _id: resetToken._id });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password reset failed:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  };

  loginUser = async (
    req: express.Request,
    res: express.Response,
    allowedRoles: string[]
  ) => {
    let username = req.body.username;
    let password = req.body.password;

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required" });
      return;
    }

    username = username.trim();

    try {
      const user = await UserModel.findOne({ username }).select(
        "+passwordHash"
      );

      if (!user || !allowedRoles.includes(user.role)) {
        res.status(401).json({ message: "Username or password is incorrect" });
        return;
      }

      if (user.status === "pending") {
        res
          .status(403)
          .json({ message: "Registration request is still pending" });
        return;
      }

      if (user.status !== "active") {
        res.status(403).json({ message: "User account is not active" });
        return;
      }

      if (!user.passwordHash) {
        console.error(`Password hash is missing for user: ${user.username}`);
        res.status(500).json({
          message:
            "User password is not configured. Reimport the initial database",
        });
        return;
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatches) {
        res.status(401).json({ message: "Username or password is incorrect" });
        return;
      }

      const userData: any = user.toObject();
      delete userData.passwordHash;

      res.json({
        message: "Login successful",
        user: userData,
      });
    } catch (error) {
      console.error("Login failed:", error);
      res.status(500).json({ message: "Login failed" });
    }
  };
}
