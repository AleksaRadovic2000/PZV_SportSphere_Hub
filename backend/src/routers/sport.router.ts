import express from "express";
import { SportController } from "../controllers/sport.controller";

const sportRouter = express.Router();

sportRouter.route("/all").get((req, res) => {
  new SportController().getAll(req, res);
});

sportRouter.route("/add").post((req, res) => {
  new SportController().add(req, res);
});

export default sportRouter;
