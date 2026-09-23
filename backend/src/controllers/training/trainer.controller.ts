import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import TrainerModel from "../../models/trainer";
import TrainingModel from "../../models/training";

export class TrainerController {
  getAllTrainers = async (_req: express.Request, res: express.Response) => {
    try {
      const trainers = await TrainerModel.find({}).sort({ lastName: 1, firstName: 1 });
      const facilityIds = [...new Set(trainers.map((trainer) => trainer.facilityId.toString()))];
      const facilities = await FacilityModel.find({ _id: { $in: facilityIds } });
      const result = trainers.map((trainer) => {
        const facility = facilities.find(
          (item) => item._id.toString() === trainer.facilityId.toString(),
        );

        return {
          ...trainer.toObject(),
          facilityName: facility?.name || "",
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Ucitavanje trenera nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje trenera nije uspelo" });
    }
  };

  deactivateTrainer = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "ID trenera nije ispravan" });
      return;
    }

    try {
      const trainer = await TrainerModel.findByIdAndUpdate(id, { active: false }, { new: true });

      if (!trainer) {
        res.status(404).json({ message: "Trener nije pronadjen" });
        return;
      }

      res.json({ message: "Trener je uspesno deaktiviran" });
    } catch (error) {
      console.error("Deaktiviranje trenera nije uspelo:", error);
      res.status(500).json({ message: "Deaktiviranje trenera nije uspelo" });
    }
  };

  searchTrainers = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let sport = req.body.sport;

    if (!mongoose.isValidObjectId(facilityId) || !sport) {
      res.status(400).json({ message: "Objekat i sport su obavezni" });
      return;
    }

    sport = sport.trim();

    try {
      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Aktivan objekat nije pronadjen" });
        return;
      }

      const trainers = await TrainerModel.find({
        facilityId,
        sports: sport,
        active: true,
      }).sort({ averageRating: -1, lastName: 1 });

      res.json(trainers);
    } catch (error) {
      console.error("Pretraga trenera nije uspela:", error);
      res.status(500).json({ message: "Pretraga trenera nije uspela" });
    }
  };

  getTrainerSchedule = async (req: express.Request, res: express.Response) => {
    let trainerId = req.body.trainerId;

    if (!mongoose.isValidObjectId(trainerId)) {
      res.status(400).json({ message: "ID trenera nije ispravan" });
      return;
    }

    try {
      const trainings = await TrainingModel.find({
        trainerId,
        status: "scheduled",
        startDateTime: { $gt: new Date() },
      }).sort({ startDateTime: 1 });

      const schedule = trainings.map((training) => ({
        _id: training._id,
        startDateTime: training.startDateTime,
        endDateTime: training.endDateTime,
      }));

      res.json(schedule);
    } catch (error) {
      console.error("Ucitavanje rasporeda trenera nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje rasporeda trenera nije uspelo" });
    }
  };
}
