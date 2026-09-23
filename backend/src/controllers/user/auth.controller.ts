import { randomBytes } from "crypto";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";
import { toPng } from "jdenticon";
import PasswordResetTokenModel from "../../models/password-reset-token";
import SportModel from "../../models/sport";
import UserModel from "../../models/user";
import { isPasswordValid } from "../../utils/validations/password";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registrationNumberPattern = /^\d{8}$/;
const taxIdPattern = /^[1-9]\d{8}$/;

const removeUploadedFile = (file?: Express.Multer.File) => {
  if (file) {
    fs.unlink(file.path, () => undefined);
  }
};

export class AuthController {
  generateAvatar = (req: express.Request, res: express.Response) => {
    let seed = req.body.seed;

    if (!seed) {
      res.status(400).json({ message: "Vrednost za generisanje avatara je obavezna" });
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
      res.status(400).json({ message: "Podaci za registraciju su obavezni" });
      return;
    }

    try {
      data = JSON.parse(registrationData);
    } catch {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci za registraciju nisu ispravan JSON" });
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

    if (requiredFields.some((value) => typeof value !== "string" || !value.trim())) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Sva obavezna polja moraju biti popunjena" });
      return;
    }

    if (data.role !== "athlete" && data.role !== "employee") {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Mogu se registrovati samo sportisti i zaposleni" });
      return;
    }

    if (!isPasswordValid(data.password)) {
      removeUploadedFile(req.file);
      res.status(400).json({
        message:
          "Lozinka mora imati 8-12 karaktera, poceti slovom i sadrzati veliko slovo, broj i specijalni karakter",
      });
      return;
    }

    if (!emailPattern.test(data.email)) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Email adresa nije ispravna" });
      return;
    }

    const favouriteSports = Array.isArray(data.favouriteSports) ? data.favouriteSports : [];
    const distinctSports = [...new Set(favouriteSports)];

    if (distinctSports.length !== favouriteSports.length || favouriteSports.length > 5) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Izaberite najvise pet razlicitih sportova" });
      return;
    }

    try {
      const existingUser = await UserModel.findOne({
        $or: [
          { username: data.username.trim() },
          { email: data.email.trim().toLowerCase() },
        ],
      });

      if (existingUser) {
        removeUploadedFile(req.file);
        const field =
          existingUser.username === data.username.trim() ? "Korisnicko ime" : "Email";
        res.status(409).json({ message: `${field} se vec koristi` });
        return;
      }

      if (favouriteSports.length > 0) {
        const sportsInDatabase = await SportModel.countDocuments({
          name: { $in: favouriteSports },
        });

        if (sportsInDatabase !== favouriteSports.length) {
          removeUploadedFile(req.file);
          res.status(400).json({ message: "Jedan ili vise izabranih sportova ne postoje" });
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

        if (companyFields.some((value) => typeof value !== "string" || !value.trim())) {
          removeUploadedFile(req.file);
          res.status(400).json({ message: "Svi podaci o kompaniji su obavezni za zaposlenog" });
          return;
        }

        if (!registrationNumberPattern.test(data.registrationNumber)) {
          removeUploadedFile(req.file);
          res.status(400).json({
            message: "Maticni broj mora sadrzati tacno 8 cifara",
          });
          return;
        }

        if (!taxIdPattern.test(data.taxId)) {
          removeUploadedFile(req.file);
          res.status(400).json({
            message: "PIB mora sadrzati tacno 9 cifara i ne sme poceti nulom",
          });
          return;
        }

        const companyEmployees = await UserModel.find({
          role: "employee",
          registrationNumber: data.registrationNumber,
          status: { $in: ["pending", "active"] },
        });

        if (companyEmployees.length >= 2) {
          removeUploadedFile(req.file);
          res.status(409).json({ message: "Ova kompanija vec ima dva zaposlena" });
          return;
        }

        const companyDataMismatch = companyEmployees.some(
          (employee) =>
            employee.companyName !== data.companyName?.trim() ||
            employee.companyAddress !== data.companyAddress?.trim() ||
            employee.taxId !== data.taxId,
        );

        if (companyDataMismatch) {
          removeUploadedFile(req.file);
          res.status(409).json({
            message: "Podaci o kompaniji moraju odgovarati podacima postojeceg zaposlenog iste kompanije",
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
        companyName: data.role === "employee" ? data.companyName?.trim() : undefined,
        companyAddress: data.role === "employee" ? data.companyAddress?.trim() : undefined,
        registrationNumber:
          data.role === "employee" ? data.registrationNumber : undefined,
        taxId: data.role === "employee" ? data.taxId : undefined,
      });

      const userData: any = user.toObject();
      delete userData.passwordHash;

      res.status(201).json({
        message: "Zahtev za registraciju je kreiran i ceka odobrenje administratora",
        user: userData,
      });
    } catch (error) {
      removeUploadedFile(req.file);
      console.error("Registracija nije uspela:", error);
      res.status(500).json({ message: "Registracija nije uspela" });
    }
  };

  login = async (req: express.Request, res: express.Response) => {
    await this.loginUser(req, res, ["athlete", "employee"]);
  };

  adminLogin = async (req: express.Request, res: express.Response) => {
    await this.loginUser(req, res, ["admin"]);
  };

  requestPasswordReset = async (req: express.Request, res: express.Response) => {
    let identifier = req.body.identifier;

    if (!identifier) {
      res.status(400).json({ message: "Korisnicko ime ili email su obavezni" });
      return;
    }

    identifier = identifier.trim();

    try {
      const user = await UserModel.findOne({
        status: "active",
        $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
      });

      if (!user) {
        res.status(404).json({ message: "Aktivan korisnik nije pronadjen" });
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
        message: "Link za promenu lozinke je kreiran i vazi 30 minuta",
        resetUrl: `http://localhost:4200/reset-password/${token}`,
      });
    } catch (error) {
      console.error("Zahtev za promenu lozinke nije uspeo:", error);
      res.status(500).json({ message: "Zahtev za promenu lozinke nije uspeo" });
    }
  };

  resetPassword = async (req: express.Request, res: express.Response) => {
    let token = req.body.token;
    let newPassword = req.body.newPassword;

    if (!token || !isPasswordValid(newPassword)) {
      res.status(400).json({
        message:
          "Neophodni su ispravan token i lozinka od 8-12 karaktera sa velikim slovom, brojem i specijalnim karakterom",
      });
      return;
    }

    token = token.trim();

    try {
      const resetToken = await PasswordResetTokenModel.findOne({
        token,
        expiresAt: { $gt: new Date() },
      });

      if (!resetToken) {
        res.status(400).json({ message: "Link za promenu lozinke nije ispravan ili je istekao" });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await UserModel.updateOne({ username: resetToken.username }, { passwordHash });
      await PasswordResetTokenModel.deleteOne({ _id: resetToken._id });

      res.json({ message: "Lozinka je uspesno promenjena" });
    } catch (error) {
      console.error("Promena lozinke nije uspela:", error);
      res.status(500).json({ message: "Promena lozinke nije uspela" });
    }
  };

  loginUser = async (
    req: express.Request,
    res: express.Response,
    allowedRoles: string[],
  ) => {
    let username = req.body.username;
    let password = req.body.password;

    if (!username || !password) {
      res.status(400).json({ message: "Korisnicko ime i lozinka su obavezni" });
      return;
    }

    username = username.trim();

    try {
      const user = await UserModel.findOne({ username }).select("+passwordHash");

      if (!user || !allowedRoles.includes(user.role)) {
        res.status(401).json({ message: "Korisnicko ime ili lozinka nisu ispravni" });
        return;
      }

      if (user.status === "pending") {
        res.status(403).json({ message: "Zahtev za registraciju jos uvek ceka odobrenje" });
        return;
      }

      if (user.status !== "active") {
        res.status(403).json({ message: "Korisnicki nalog nije aktivan" });
        return;
      }

      if (!user.passwordHash) {
        console.error(`Nedostaje hash lozinke za korisnika: ${user.username}`);
        res.status(500).json({
          message: "Lozinka korisnika nije podesena. Ponovo uvezite pocetnu bazu podataka",
        });
        return;
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatches) {
        res.status(401).json({ message: "Korisnicko ime ili lozinka nisu ispravni" });
        return;
      }

      const userData: any = user.toObject();
      delete userData.passwordHash;

      res.json({
        message: "Prijava je uspesna",
        user: userData,
      });
    } catch (error) {
      console.error("Prijava nije uspela:", error);
      res.status(500).json({ message: "Prijava nije uspela" });
    }
  };
}
