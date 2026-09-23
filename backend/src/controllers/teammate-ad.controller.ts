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
        console.error("Ucitavanje oglasa za saigrace nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje oglasa za saigrace nije uspelo" });
      });
  };

  getMine = (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    TeammateAdModel.find({ authorUsername: username })
      .sort({ startDateTime: -1 })
      .then((ads) => res.json(ads))
      .catch((error) => {
        console.error("Ucitavanje oglasa sportiste nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje oglasa sportiste nije uspelo" });
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
      res.status(400).json({ message: "Sportista, sport i grad su obavezni" });
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
      res.status(400).json({ message: "Vremenski interval oglasa nije ispravan" });
      return;
    }

    if (!Number.isInteger(playersNeeded) || playersNeeded < 1) {
      res.status(400).json({ message: "Broj igraca mora biti pozitivan ceo broj" });
      return;
    }

    try {
      const athlete = await UserModel.findOne({
        username: authorUsername,
        role: "athlete",
        status: "active",
      });

      if (!athlete) {
        res.status(404).json({ message: "Aktivan sportista nije pronadjen" });
        return;
      }

      const selectedSport = await SportModel.findOne({ name: sport });

      if (!selectedSport) {
        res.status(400).json({ message: "Izabrani sport ne postoji" });
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

      res.status(201).json({ message: "Oglas za saigrace je uspesno kreiran", ad });
    } catch (error) {
      console.error("Kreiranje oglasa za saigrace nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje oglasa za saigrace nije uspelo" });
    }
  };

  join = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "ID oglasa i korisnicko ime sportiste su obavezni" });
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

      const ad = await TeammateAdModel.findOne({
        _id: id,
        status: "active",
        startDateTime: { $gt: new Date() },
      });

      if (!ad) {
        res.status(404).json({ message: "Aktivan oglas za saigrace nije pronadjen" });
        return;
      }

      if (ad.authorUsername === athleteUsername) {
        res.status(400).json({ message: "Autor ne moze da se prijavi na sopstveni oglas" });
        return;
      }

      if (ad.requests.some((request) => request.athleteUsername === athleteUsername)) {
        res.status(409).json({ message: "Zahtev za pridruzivanje je vec poslat" });
        return;
      }

      ad.requests.push({ athleteUsername, status: "pending" });
      await ad.save();
      res.json({ message: "Zahtev za pridruzivanje je uspesno poslat", ad });
    } catch (error) {
      console.error("Slanje zahteva za pridruzivanje nije uspelo:", error);
      res.status(500).json({ message: "Slanje zahteva za pridruzivanje nije uspelo" });
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
      res.status(400).json({ message: "Podaci o odluci za zahtev nisu ispravni" });
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
        res.status(404).json({ message: "Aktivan oglas ovog sportiste nije pronadjen" });
        return;
      }

      const request = ad.requests.id(requestId);

      if (!request || request.status !== "pending") {
        res.status(404).json({ message: "Zahtev za pridruzivanje na cekanju nije pronadjen" });
        return;
      }

      request.status = status;
      const acceptedRequests = ad.requests.filter((item) => item.status === "accepted").length;

      if (acceptedRequests >= ad.playersNeeded) {
        ad.status = "completed";
      }

      await ad.save();
      res.json({ message: "Zahtev za pridruzivanje je uspesno obradjen", ad });
    } catch (error) {
      console.error("Obrada zahteva za pridruzivanje nije uspela:", error);
      res.status(500).json({ message: "Obrada zahteva za pridruzivanje nije uspela" });
    }
  };

  close = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let authorUsername = req.body.authorUsername;

    if (!mongoose.isValidObjectId(id) || !authorUsername) {
      res.status(400).json({ message: "ID oglasa i korisnicko ime autora su obavezni" });
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
        res.status(404).json({ message: "Aktivan oglas ovog sportiste nije pronadjen" });
        return;
      }

      res.json({ message: "Oglas za saigrace je uspesno zatvoren", ad });
    } catch (error) {
      console.error("Zatvaranje oglasa za saigrace nije uspelo:", error);
      res.status(500).json({ message: "Zatvaranje oglasa za saigrace nije uspelo" });
    }
  };
}
