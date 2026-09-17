import express from "express";
import { ReservationController } from "../controllers/reservation.controller";

const reservationRouter = express.Router();

reservationRouter.route("/schedule").post((req, res) => {
  new ReservationController().getSchedule(req, res);
});

reservationRouter.route("/create").post((req, res) => {
  new ReservationController().create(req, res);
});

reservationRouter.route("/athlete/:username").get((req, res) => {
  new ReservationController().getAthleteReservations(req, res);
});

reservationRouter.route("/cancel").post((req, res) => {
  new ReservationController().cancel(req, res);
});

export default reservationRouter;
