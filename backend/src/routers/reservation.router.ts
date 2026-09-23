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

reservationRouter.route("/statistics/:username").get((req, res) => {
  new ReservationController().getStatistics(req, res);
});

reservationRouter.route("/facility/:id").get((req, res) => {
  new ReservationController().getFacilityReservations(req, res);
});

reservationRouter.route("/attendance").post((req, res) => {
  new ReservationController().markAttendance(req, res);
});

reservationRouter.route("/move").post((req, res) => {
  new ReservationController().move(req, res);
});

reservationRouter.route("/cancel").post((req, res) => {
  new ReservationController().cancel(req, res);
});

export default reservationRouter;
