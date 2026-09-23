import express from "express";
import mongoose from "mongoose";
import SportModel from "../models/sport";
import TeammateAdModel from "../models/teammate-ad";
import UserModel from "../models/user";

export class TeammateAdController {
  getActive = (_req: express.Request, res: express.Response) => {
    TeammateAdModel.find({
      status: "active",
      startDateTime: { $gt: new Date() },
    })
      .sort({ startDateTime: 1 })
      .then((ads) => res.json(ads))
      .catch((error) => {
        console.error("Failed to load teammate ads:", error);
        res.status(500).json({ message: "Failed to load teammate ads" });
      });
  };

  getMine = (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    TeammateAdModel.find({ authorUsername: username })
      .sort({ startDateTime: -1 })
      .then((ads) => res.json(ads))
      .catch((error) => {
        console.error("Failed to load athlete ads:", error);
        res.status(500).json({ message: "Failed to load athlete ads" });
      });
  };

  create = async (req: express.Request, res: express.Response) => {
    let authorUsername = req.body.authorUsername;
    let sport = req.body.sport;
    let city = req.body.city;
    let startDateTimeValue = req.body.startDateTime;
    let endDateTimeValue = req.body.endDateTime;
    let startDateTime = new Date(startDateTimeValue);
    let endDateTime = new Date(endDateTimeValue);
    let playersNeeded = req.body.playersNeeded;

    if (!authorUsername || !sport || !city) {
      res.status(400).json({ message: "Athlete, sport and city are required" });
      return;
    }

    authorUsername = authorUsername.trim();
    sport = sport.trim();
    city = city.trim();

    if (
      isNaN(startDateTime.getTime()) ||
      isNaN(endDateTime.getTime()) ||
      startDateTime <= new Date() ||
      endDateTime <= startDateTime
    ) {
      res.status(400).json({ message: "Ad time interval is not valid" });
      return;
    }

    if (!Number.isInteger(playersNeeded) || playersNeeded < 1) {
      res.status(400).json({ message: "Number of players must be a positive whole number" });
      return;
    }

    try {
      const athlete = await UserModel.findOne({
        username: authorUsername,
        role: "athlete",
        status: "active",
      });

      if (!athlete) {
        res.status(404).json({ message: "Active athlete was not found" });
        return;
      }

      const selectedSport = await SportModel.findOne({ name: sport });

      if (!selectedSport) {
        res.status(400).json({ message: "Selected sport does not exist" });
        return;
      }

      const ad = await TeammateAdModel.create({
        authorUsername,
        sport,
        city,
        startDateTime,
        endDateTime,
        playersNeeded,
        status: "active",
        requests: [],
      });

      res.status(201).json({ message: "Teammate ad created successfully", ad });
    } catch (error) {
      console.error("Teammate ad creation failed:", error);
      res.status(500).json({ message: "Teammate ad creation failed" });
    }
  };

  join = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "Ad ID and athlete username are required" });
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

      const ad = await TeammateAdModel.findOne({
        _id: id,
        status: "active",
        startDateTime: { $gt: new Date() },
      });

      if (!ad) {
        res.status(404).json({ message: "Active teammate ad was not found" });
        return;
      }

      if (ad.authorUsername === athleteUsername) {
        res.status(400).json({ message: "Author cannot join their own ad" });
        return;
      }

      if (ad.requests.some((request) => request.athleteUsername === athleteUsername)) {
        res.status(409).json({ message: "Join request has already been sent" });
        return;
      }

      ad.requests.push({ athleteUsername, status: "pending" });
      await ad.save();
      res.json({ message: "Join request sent successfully", ad });
    } catch (error) {
      console.error("Join request failed:", error);
      res.status(500).json({ message: "Join request failed" });
    }
  };

  resolve = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let authorUsername = req.body.authorUsername;
    let requestId = req.body.requestId;
    let status = req.body.status;

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(requestId) ||
      !authorUsername ||
      !["accepted", "rejected"].includes(status)
    ) {
      res.status(400).json({ message: "Request decision data is not valid" });
      return;
    }

    authorUsername = authorUsername.trim();

    try {
      const ad = await TeammateAdModel.findOne({
        _id: id,
        authorUsername,
        status: "active",
      });

      if (!ad) {
        res.status(404).json({ message: "Active ad owned by this athlete was not found" });
        return;
      }

      const request = ad.requests.id(requestId);

      if (!request || request.status !== "pending") {
        res.status(404).json({ message: "Pending join request was not found" });
        return;
      }

      request.status = status;
      const acceptedRequests = ad.requests.filter((item) => item.status === "accepted").length;

      if (acceptedRequests >= ad.playersNeeded) {
        ad.status = "completed";
      }

      await ad.save();
      res.json({ message: "Join request resolved successfully", ad });
    } catch (error) {
      console.error("Join request resolution failed:", error);
      res.status(500).json({ message: "Join request resolution failed" });
    }
  };

  close = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let authorUsername = req.body.authorUsername;

    if (!mongoose.isValidObjectId(id) || !authorUsername) {
      res.status(400).json({ message: "Ad ID and author username are required" });
      return;
    }

    authorUsername = authorUsername.trim();

    try {
      const ad = await TeammateAdModel.findOneAndUpdate(
        { _id: id, authorUsername, status: "active" },
        { status: "closed" },
        { new: true },
      );

      if (!ad) {
        res.status(404).json({ message: "Active ad owned by this athlete was not found" });
        return;
      }

      res.json({ message: "Teammate ad closed successfully", ad });
    } catch (error) {
      console.error("Teammate ad closing failed:", error);
      res.status(500).json({ message: "Teammate ad closing failed" });
    }
  };
}
