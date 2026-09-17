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
}
