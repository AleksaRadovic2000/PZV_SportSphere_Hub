import express from "express";
import { FacilityController } from "../controllers/facility.controller";
import { PublicFacilityController } from "../controllers/public-facility.controller";
import { facilityImageUpload, facilityJsonUpload } from "../middleware/facility-upload";

const facilityRouter = express.Router();

facilityRouter.route("/employee/:username").get((req, res) => {
  new FacilityController().getEmployeeFacilities(req, res);
});

facilityRouter.route("/managed/:id/:username").get((req, res) => {
  new FacilityController().getManagedDetails(req, res);
});

facilityRouter.route("/create").post(facilityImageUpload.array("images", 6), (req, res) => {
  new FacilityController().create(req, res);
});

facilityRouter.route("/update").post(facilityImageUpload.array("images", 6), (req, res) => {
  new FacilityController().update(req, res);
});

facilityRouter.route("/import").post(facilityJsonUpload.single("facilityFile"), (req, res) => {
  new FacilityController().importFacility(req, res);
});

facilityRouter.route("/pending").get((req, res) => {
  new FacilityController().getPending(req, res);
});

facilityRouter.route("/approve").post((req, res) => {
  new FacilityController().approve(req, res);
});

facilityRouter.route("/reject").post((req, res) => {
  new FacilityController().reject(req, res);
});

facilityRouter.route("/public-info").get((req, res) => {
  new PublicFacilityController().getPublicInfo(req, res);
});

facilityRouter.route("/cities").get((req, res) => {
  new PublicFacilityController().getCities(req, res);
});

facilityRouter.route("/search").post((req, res) => {
  new PublicFacilityController().search(req, res);
});

facilityRouter.route("/details/:id").get((req, res) => {
  new PublicFacilityController().getPublicDetails(req, res);
});

facilityRouter.route("/promotions/current").get((req, res) => {
  new PublicFacilityController().getCurrentPromotions(req, res);
});

export default facilityRouter;
