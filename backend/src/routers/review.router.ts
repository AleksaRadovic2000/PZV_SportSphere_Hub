import express from "express";
import { ReviewController } from "../controllers/review.controller";

const reviewRouter = express.Router();

reviewRouter.route("/create").post((req, res) => {
  new ReviewController().create(req, res);
});

reviewRouter.route("/recent/:facilityId").get((req, res) => {
  new ReviewController().getRecent(req, res);
});

reviewRouter.route("/reviewed/:athleteUsername/:facilityId").get((req, res) => {
  new ReviewController().getReviewedReservationIds(req, res);
});

export default reviewRouter;
