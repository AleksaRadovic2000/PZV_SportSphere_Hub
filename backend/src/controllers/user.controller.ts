import fs from "fs";
import express from "express";
import FacilityModel from "../models/facility";
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
        console.error("Ucitavanje zahteva za registraciju nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje zahteva za registraciju nije uspelo" });
      });
  };

  approveUser = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!username) {
      res.status(400).json({ message: "Korisnicko ime je obavezno" });
      return;
    }

    username = username.trim();

    try {
      const user = await UserModel.findOneAndUpdate(
        { username, status: "pending" },
        { status: "active" },
        { new: true },
      );

      if (!user) {
        res.status(404).json({ message: "Zahtev za registraciju na cekanju nije pronadjen" });
        return;
      }

      if (user.role === "employee" && user.registrationNumber) {
        await FacilityModel.updateMany(
          { companyRegistrationNumber: user.registrationNumber },
          { $addToSet: { employeeUsernames: user.username } },
        );
      }

      res.json({ message: "Zahtev za registraciju je odobren" });
    } catch (error) {
      console.error("Odobravanje registracije nije uspelo:", error);
      res.status(500).json({ message: "Odobravanje registracije nije uspelo" });
    }
  };

  rejectUser = (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!username) {
      res.status(400).json({ message: "Korisnicko ime je obavezno" });
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
          res.status(404).json({ message: "Zahtev za registraciju na cekanju nije pronadjen" });
          return;
        }

        res.json({ message: "Zahtev za registraciju je odbijen" });
      })
      .catch((error) => {
        console.error("Odbijanje registracije nije uspelo:", error);
        res.status(500).json({ message: "Odbijanje registracije nije uspelo" });
      });
  };

  adminUpdate = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let phone = req.body.phone;
    let email = req.body.email;

    if (!username || !firstName || !lastName || !phone || !email) {
      res.status(400).json({ message: "Sva obavezna polja moraju biti popunjena" });
      return;
    }

    username = username.trim();
    firstName = firstName.trim();
    lastName = lastName.trim();
    phone = phone.trim();
    email = email.trim().toLowerCase();

    if (!emailPattern.test(email)) {
      res.status(400).json({ message: "Email adresa nije ispravna" });
      return;
    }

    try {
      const user = await UserModel.findOne({ username });

      if (!user) {
        res.status(404).json({ message: "Korisnik nije pronadjen" });
        return;
      }

      const userWithSameEmail = await UserModel.findOne({
        email,
        username: { $ne: username },
      });

      if (userWithSameEmail) {
        res.status(409).json({ message: "Email se vec koristi" });
        return;
      }

      const updatedUser = await UserModel.findOneAndUpdate(
        { username },
        { firstName, lastName, phone, email },
        { new: true, runValidators: true },
      );

      res.json({
        message: "Korisnik je uspesno izmenjen",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Izmena korisnika nije uspela:", error);
      res.status(500).json({ message: "Izmena korisnika nije uspela" });
    }
  };

  deleteUser = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!username) {
      res.status(400).json({ message: "Korisnicko ime je obavezno" });
      return;
    }

    username = username.trim();

    try {
      const user = await UserModel.findOne({ username });

      if (!user) {
        res.status(404).json({ message: "Korisnik nije pronadjen" });
        return;
      }

      if (user.role === "admin") {
        const adminCount = await UserModel.countDocuments({ role: "admin" });

        if (adminCount <= 1) {
          res.status(400).json({ message: "Jedini administrator ne moze biti obrisan" });
          return;
        }
      }

      await UserModel.deleteOne({ username });

      if (user.role === "employee") {
        await FacilityModel.updateMany(
          { employeeUsernames: username },
          { $pull: { employeeUsernames: username } },
        );
      }
      res.json({ message: "Korisnik je uspesno obrisan" });
    } catch (error) {
      console.error("Brisanje korisnika nije uspelo:", error);
      res.status(500).json({ message: "Brisanje korisnika nije uspelo" });
    }
  };

  getAll = (_req: express.Request, res: express.Response) => {
    UserModel.find({})
      .sort({ role: 1, username: 1 })
      .then((users) => {
        res.json(users);
      })
      .catch((error) => {
        console.error("Ucitavanje korisnika nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje korisnika nije uspelo" });
      });
  };

  getProfile = (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    UserModel.findOne({ username })
      .then((user) => {
        if (!user) {
          res.status(404).json({ message: "Korisnik nije pronadjen" });
          return;
        }

        res.json(user);
      })
      .catch((error) => {
        console.error("Ucitavanje profila nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje profila nije uspelo" });
      });
  };

  updateProfile = async (req: express.Request, res: express.Response) => {
    let profileData = req.body.user;
    let data;

    if (!profileData) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o profilu su obavezni" });
      return;
    }

    try {
      data = JSON.parse(profileData);
    } catch {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o profilu nisu ispravan JSON" });
      return;
    }

    let username = data.username;
    let firstName = data.firstName;
    let lastName = data.lastName;
    let phone = data.phone;
    let email = data.email;

    if (!username || !firstName || !lastName || !phone || !email) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Sva obavezna polja moraju biti popunjena" });
      return;
    }

    username = username.trim();
    firstName = firstName.trim();
    lastName = lastName.trim();
    phone = phone.trim();
    email = email.trim().toLowerCase();

    if (!emailPattern.test(email)) {
      removeUploadedFile(req.file);
      res.status(400).json({ message: "Email adresa nije ispravna" });
      return;
    }

    try {
      const user = await UserModel.findOne({ username });

      if (!user) {
        removeUploadedFile(req.file);
        res.status(404).json({ message: "Korisnik nije pronadjen" });
        return;
      }

      const userWithSameEmail = await UserModel.findOne({
        email,
        username: { $ne: username },
      });

      if (userWithSameEmail) {
        removeUploadedFile(req.file);
        res.status(409).json({ message: "Email se vec koristi" });
        return;
      }

      let favouriteSports = user.favouriteSports;

      if (user.role === "athlete") {
        favouriteSports = Array.isArray(data.favouriteSports) ? data.favouriteSports : [];

        const distinctSports = [...new Set(favouriteSports)];

        if (distinctSports.length !== favouriteSports.length || favouriteSports.length > 5) {
          removeUploadedFile(req.file);
          res.status(400).json({ message: "Izaberite najvise pet razlicitih sportova" });
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
        message: "Profil je uspesno izmenjen",
        user: updatedUser,
      });
    } catch (error) {
      removeUploadedFile(req.file);
      console.error("Izmena profila nije uspela:", error);
      res.status(500).json({ message: "Izmena profila nije uspela" });
    }
  };
}
