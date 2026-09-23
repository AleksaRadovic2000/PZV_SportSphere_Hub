import express from "express";
import FacilityModel from "../../models/facility";
import UserModel from "../../models/user";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminController {
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
}
