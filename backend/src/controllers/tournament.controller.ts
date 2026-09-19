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
      console.error("Failed to load open tournaments:", error);
      res.status(500).json({ message: "Failed to load open tournaments" });
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
      console.error("Failed to load athlete tournaments:", error);
      res.status(500).json({ message: "Failed to load athlete tournaments" });
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
      console.error("Failed to load employee tournaments:", error);
      res.status(500).json({ message: "Failed to load employee tournaments" });
    }
  };

  create = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let createdByUsername = req.body.createdByUsername;
    let name = req.body.name;
    let sport = req.body.sport;
    let startDateTime = new Date(req.body.startDateTime);

    if (
      !mongoose.isValidObjectId(facilityId) ||
      !createdByUsername ||
      !name ||
      !sport ||
      isNaN(startDateTime.getTime()) ||
      startDateTime <= new Date()
    ) {
      res.status(400).json({ message: "Tournament data is not valid" });
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
        res.status(404).json({ message: "Active employee was not found" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: facilityId,
        status: "active",
        employeeUsernames: createdByUsername,
      });

      if (!facility) {
        res.status(404).json({ message: "Active managed facility was not found" });
        return;
      }

      const selectedSport = await SportModel.findOne({ name: sport });

      if (!selectedSport) {
        res.status(400).json({ message: "Selected sport does not exist" });
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

      res.status(201).json({ message: "Tournament created successfully", tournament });
    } catch (error) {
      console.error("Tournament creation failed:", error);
      res.status(500).json({ message: "Tournament creation failed" });
    }
  };

  apply = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "Tournament ID and athlete username are required" });
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
        res.status(404).json({ message: "Active athlete was not found" });
        return;
      }

      const tournament = await TournamentModel.findOne({
        _id: id,
        status: "open",
        startDateTime: { $gt: new Date() },
      });

      if (!tournament) {
        res.status(404).json({ message: "Open future tournament was not found" });
        return;
      }

      const alreadyApplied = tournament.applications.some(
        (application) => application.athleteUsername === athleteUsername,
      );

      if (alreadyApplied) {
        res.status(409).json({ message: "Tournament application has already been sent" });
        return;
      }

      tournament.applications.push({ athleteUsername, status: "pending" });
      await tournament.save();
      res.json({ message: "Tournament application sent successfully", tournament });
    } catch (error) {
      console.error("Tournament application failed:", error);
      res.status(500).json({ message: "Tournament application failed" });
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
      res.status(400).json({ message: "Application decision data is not valid" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const tournament = await TournamentModel.findOne({ _id: id, status: "open" });

      if (!tournament) {
        res.status(404).json({ message: "Open tournament was not found" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: tournament.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Employee does not manage this facility" });
        return;
      }

      const application = tournament.applications.id(applicationId);

      if (!application || application.status !== "pending") {
        res.status(404).json({ message: "Pending tournament application was not found" });
        return;
      }

      application.status = status;
      await tournament.save();
      res.json({ message: "Tournament application resolved successfully", tournament });
    } catch (error) {
      console.error("Tournament application resolution failed:", error);
      res.status(500).json({ message: "Tournament application resolution failed" });
    }
  };

  close = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;

    if (!mongoose.isValidObjectId(id) || !employeeUsername) {
      res.status(400).json({ message: "Tournament ID and employee username are required" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const tournament = await TournamentModel.findOne({ _id: id, status: "open" });

      if (!tournament) {
        res.status(404).json({ message: "Open tournament was not found" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: tournament.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Employee does not manage this facility" });
        return;
      }

      tournament.status = "closed";
      await tournament.save();
      res.json({ message: "Tournament closed successfully", tournament });
    } catch (error) {
      console.error("Tournament closing failed:", error);
      res.status(500).json({ message: "Tournament closing failed" });
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
