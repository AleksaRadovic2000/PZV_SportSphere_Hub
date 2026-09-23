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
        console.error("Failed to load sports:", error);
        res.status(500).json({ message: "Failed to load sports" });
      });
  };

  add = async (req: express.Request, res: express.Response) => {
    let name = req.body.name;

    if (!name || !name.trim()) {
      res.status(400).json({ message: "Sport name is required" });
      return;
    }

    name = name.trim();

    try {
      const sports = await SportModel.find({});
      const exists = sports.some((sport) => sport.name.toLowerCase() === name.toLowerCase());

      if (exists) {
        res.status(409).json({ message: "Sport already exists" });
        return;
      }

      const sport = await SportModel.create({ name });
      res.status(201).json({ message: "Sport added successfully", sport });
    } catch (error) {
      console.error("Sport creation failed:", error);
      res.status(500).json({ message: "Sport creation failed" });
    }
  };
}
