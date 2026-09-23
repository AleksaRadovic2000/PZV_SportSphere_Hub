import express from "express";
import { ReportController } from "../controllers/report.controller";

const reportRouter = express.Router();

reportRouter.route("/occupancy").get((req, res) => {
  new ReportController().occupancy(req, res);
});

reportRouter.route("/sales").get((req, res) => {
  new ReportController().sales(req, res);
});

export default reportRouter;
