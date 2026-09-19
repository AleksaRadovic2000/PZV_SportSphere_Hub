import express from "express";
import { TournamentController } from "../controllers/tournament.controller";

const tournamentRouter = express.Router();

tournamentRouter.route("/open").get((req, res) => {
  new TournamentController().getOpen(req, res);
});

tournamentRouter.route("/athlete/:username").get((req, res) => {
  new TournamentController().getForAthlete(req, res);
});

tournamentRouter.route("/employee/:username").get((req, res) => {
  new TournamentController().getForEmployee(req, res);
});

tournamentRouter.route("/create").post((req, res) => {
  new TournamentController().create(req, res);
});

tournamentRouter.route("/apply").post((req, res) => {
  new TournamentController().apply(req, res);
});

tournamentRouter.route("/resolve").post((req, res) => {
  new TournamentController().resolve(req, res);
});

tournamentRouter.route("/close").post((req, res) => {
  new TournamentController().close(req, res);
});

export default tournamentRouter;
