import express from "express";
import { TrainingController } from "../controllers/training.controller";

const trainingRouter = express.Router();

trainingRouter.route("/trainers/search").post((req, res) => {
  new TrainingController().searchTrainers(req, res);
});

trainingRouter.route("/trainers/schedule").post((req, res) => {
  new TrainingController().getTrainerSchedule(req, res);
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

export default trainingRouter;
