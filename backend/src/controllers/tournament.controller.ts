import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import SportModel from "../models/sport";
import TournamentModel from "../models/tournament";
import UserModel from "../models/user";

export class TournamentController {
  getOpen = async (_req: express.Request, res: express.Response) => {
    try {
      const tournaments = await TournamentModel.find({
        status: "open",
        startDateTime: { $gt: new Date() },
      }).sort({ startDateTime: 1 });

      const result = await this.addFacilityNames(tournaments);
      res.json(result);
    } catch (error) {
      console.error("Ucitavanje otvorenih turnira nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje otvorenih turnira nije uspelo" });
    }
  };

  getForAthlete = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    try {
      const tournaments = await TournamentModel.find({
        "applications.athleteUsername": username,
      }).sort({ startDateTime: -1 });

      const result = await this.addFacilityNames(tournaments);
      res.json(result);
    } catch (error) {
      console.error("Ucitavanje turnira sportiste nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje turnira sportiste nije uspelo" });
    }
  };

  getForEmployee = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    try {
      const facilities = await FacilityModel.find({ employeeUsernames: username });
      const facilityIds = facilities.map((facility) => facility._id);
      const tournaments = await TournamentModel.find({
        facilityId: { $in: facilityIds },
      }).sort({ startDateTime: -1 });

      const result = await this.addFacilityNames(tournaments);
      res.json(result);
    } catch (error) {
      console.error("Ucitavanje turnira zaposlenog nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje turnira zaposlenog nije uspelo" });
    }
  };

  create = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let createdByUsername = req.body.createdByUsername;
    let name = req.body.name;
    let sport = req.body.sport;
    let startDateTimeValue = req.body.startDateTime;
    let startDateTime = new Date(startDateTimeValue);

    if (
      !mongoose.isValidObjectId(facilityId) ||
      !createdByUsername ||
      !name ||
      !sport ||
      isNaN(startDateTime.getTime()) ||
      startDateTime <= new Date()
    ) {
      res.status(400).json({ message: "Podaci o turniru nisu ispravni" });
      return;
    }

    createdByUsername = createdByUsername.trim();
    name = name.trim();
    sport = sport.trim();

    try {
      const employee = await UserModel.findOne({
        username: createdByUsername,
        role: "employee",
        status: "active",
      });

      if (!employee) {
        res.status(404).json({ message: "Aktivan zaposleni nije pronadjen" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: facilityId,
        status: "active",
        employeeUsernames: createdByUsername,
      });

      if (!facility) {
        res.status(404).json({ message: "Aktivan objekat kojim zaposleni upravlja nije pronadjen" });
        return;
      }

      const selectedSport = await SportModel.findOne({ name: sport });

      if (!selectedSport) {
        res.status(400).json({ message: "Izabrani sport ne postoji" });
        return;
      }

      const tournament = await TournamentModel.create({
        facilityId,
        createdByUsername,
        name,
        sport,
        startDateTime,
        status: "open",
        applications: [],
      });

      res.status(201).json({ message: "Turnir je uspesno kreiran", tournament });
    } catch (error) {
      console.error("Kreiranje turnira nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje turnira nije uspelo" });
    }
  };

  apply = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "ID turnira i korisnicko ime sportiste su obavezni" });
      return;
    }

    athleteUsername = athleteUsername.trim();

    try {
      const athlete = await UserModel.findOne({
        username: athleteUsername,
        role: "athlete",
        status: "active",
      });

      if (!athlete) {
        res.status(404).json({ message: "Aktivan sportista nije pronadjen" });
        return;
      }

      const tournament = await TournamentModel.findOne({
        _id: id,
        status: "open",
        startDateTime: { $gt: new Date() },
      });

      if (!tournament) {
        res.status(404).json({ message: "Otvoren buduci turnir nije pronadjen" });
        return;
      }

      const alreadyApplied = tournament.applications.some(
        (application) => application.athleteUsername === athleteUsername,
      );

      if (alreadyApplied) {
        res.status(409).json({ message: "Prijava za turnir je vec poslata" });
        return;
      }

      tournament.applications.push({ athleteUsername, status: "pending" });
      await tournament.save();
      res.json({ message: "Prijava za turnir je uspesno poslata", tournament });
    } catch (error) {
      console.error("Prijava za turnir nije uspela:", error);
      res.status(500).json({ message: "Prijava za turnir nije uspela" });
    }
  };

  resolve = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let applicationId = req.body.applicationId;
    let status = req.body.status;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(applicationId) ||
      !employeeUsername ||
      !["accepted", "rejected"].includes(status)
    ) {
      res.status(400).json({ message: "Podaci o odluci za prijavu nisu ispravni" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const tournament = await TournamentModel.findOne({ _id: id, status: "open" });

      if (!tournament) {
        res.status(404).json({ message: "Otvoren turnir nije pronadjen" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: tournament.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Zaposleni ne upravlja ovim objektom" });
        return;
      }

      const application = tournament.applications.id(applicationId);

      if (!application || application.status !== "pending") {
        res.status(404).json({ message: "Prijava za turnir na cekanju nije pronadjena" });
        return;
      }

      application.status = status;
      await tournament.save();
      res.json({ message: "Prijava za turnir je uspesno obradjena", tournament });
    } catch (error) {
      console.error("Obrada prijave za turnir nije uspela:", error);
      res.status(500).json({ message: "Obrada prijave za turnir nije uspela" });
    }
  };

  close = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;

    if (!mongoose.isValidObjectId(id) || !employeeUsername) {
      res.status(400).json({ message: "ID turnira i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const tournament = await TournamentModel.findOne({ _id: id, status: "open" });

      if (!tournament) {
        res.status(404).json({ message: "Otvoren turnir nije pronadjen" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: tournament.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Zaposleni ne upravlja ovim objektom" });
        return;
      }

      tournament.status = "closed";
      await tournament.save();
      res.json({ message: "Turnir je uspesno zatvoren", tournament });
    } catch (error) {
      console.error("Zatvaranje turnira nije uspelo:", error);
      res.status(500).json({ message: "Zatvaranje turnira nije uspelo" });
    }
  };

  private addFacilityNames = async (tournaments: any[]) => {
    const result = [];

    for (const tournament of tournaments) {
      const facility = await FacilityModel.findById(tournament.facilityId);
      result.push({
        ...tournament.toObject(),
        facilityName: facility ? facility.name : "",
      });
    }

    return result;
  };
}
