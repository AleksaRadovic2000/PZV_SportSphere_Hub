import express from "express";
import SportModel from "../models/sport";

export class SportController {
  getAll = (_req: express.Request, res: express.Response) => {
    SportModel.find({})
      .sort({ name: 1 })
      .then((sports) => {
        res.json(sports);
      })
      .catch((error) => {
        console.error("Ucitavanje sportova nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje sportova nije uspelo" });
      });
  };

  add = async (req: express.Request, res: express.Response) => {
    let name = req.body.name;

    if (!name || !name.trim()) {
      res.status(400).json({ message: "Naziv sporta je obavezan" });
      return;
    }

    name = name.trim();

    try {
      const sports = await SportModel.find({});
      const exists = sports.some((sport) => sport.name.toLowerCase() === name.toLowerCase());

      if (exists) {
        res.status(409).json({ message: "Sport vec postoji" });
        return;
      }

      const sport = await SportModel.create({ name });
      res.status(201).json({ message: "Sport je uspesno dodat", sport });
    } catch (error) {
      console.error("Dodavanje sporta nije uspelo:", error);
      res.status(500).json({ message: "Dodavanje sporta nije uspelo" });
    }
  };
}
