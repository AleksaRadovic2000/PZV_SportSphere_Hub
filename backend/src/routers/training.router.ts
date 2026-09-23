import express from "express";
import { TrainerController } from "../controllers/training/trainer.controller";
import { TrainingController } from "../controllers/training/training.controller";

const trainingRouter = express.Router();

trainingRouter.route("/trainers/all").get((req, res) => {
  new TrainerController().getAllTrainers(req, res);
});

trainingRouter.route("/trainers/deactivate").post((req, res) => {
  new TrainerController().deactivateTrainer(req, res);
});

trainingRouter.route("/trainers/search").post((req, res) => {
  new TrainerController().searchTrainers(req, res);
});

trainingRouter.route("/trainers/schedule").post((req, res) => {
  new TrainerController().getTrainerSchedule(req, res);
});

trainingRouter.route("/create").post((req, res) => {
  new TrainingController().createTraining(req, res);
});

trainingRouter.route("/athlete/:username").get((req, res) => {
  new TrainingController().getByAthlete(req, res);
});

trainingRouter.route("/facility/:id").get((req, res) => {
  new TrainingController().getByFacility(req, res);
});

trainingRouter.route("/attendance").post((req, res) => {
  new TrainingController().markAttendance(req, res);
});

trainingRouter.route("/move").post((req, res) => {
  new TrainingController().moveTraining(req, res);
});

export default trainingRouter;
