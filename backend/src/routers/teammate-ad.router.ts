import express from "express";
import { TeammateAdController } from "../controllers/teammate-ad.controller";

const teammateAdRouter = express.Router();

teammateAdRouter.route("/active").get((req, res) => {
  new TeammateAdController().getActive(req, res);
});

teammateAdRouter.route("/mine/:username").get((req, res) => {
  new TeammateAdController().getMine(req, res);
});

teammateAdRouter.route("/create").post((req, res) => {
  new TeammateAdController().create(req, res);
});

teammateAdRouter.route("/join").post((req, res) => {
  new TeammateAdController().join(req, res);
});

teammateAdRouter.route("/resolve").post((req, res) => {
  new TeammateAdController().resolve(req, res);
});

teammateAdRouter.route("/close").post((req, res) => {
  new TeammateAdController().close(req, res);
});

export default teammateAdRouter;
