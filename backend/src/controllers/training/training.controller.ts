import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import TrainerModel from "../../models/trainer";
import TrainingModel from "../../models/training";
import UserModel from "../../models/user";
import { validateTraining } from "../../utils/validations/training-validation";

const hourInMilliseconds = 60 * 60 * 1000;

export class TrainingController {
  createTraining = async (req: express.Request, res: express.Response) => {
    let athleteUsername = req.body.athleteUsername;
    let trainerId = req.body.trainerId;
    let facilityId = req.body.facilityId;
    let resourceId = req.body.resourceId;
    let sport = req.body.sport;
    let startDateTimeValue = req.body.startDateTime;
    let endDateTimeValue = req.body.endDateTime;
    let startDateTime = new Date(startDateTimeValue);
    let endDateTime = new Date(endDateTimeValue);

    if (!athleteUsername || !sport) {
      res.status(400).json({ message: "Korisnicko ime sportiste i sport su obavezni" });
      return;
    }

    athleteUsername = athleteUsername.trim();
    sport = sport.trim();

    try {
      const athlete = await UserModel.findOne({
        username: athleteUsername,
        role: "athlete",
        status: "active",
      });

      if (!athlete) {
        res.status(404).json({ message: "Aktivan sportista nije pronadjen" });
        return;
      }

      const validation = await validateTraining(
        trainerId,
        facilityId,
        resourceId,
        sport,
        startDateTime,
        endDateTime,
        "",
        athleteUsername,
      );

      if (validation.message) {
        res.status(400).json({ message: validation.message });
        return;
      }

      const durationHours =
        (endDateTime.getTime() - startDateTime.getTime()) / hourInMilliseconds;
      const price = durationHours * validation.pricePerHour;

      const training = await TrainingModel.create({
        athleteUsername,
        trainerId,
        facilityId,
        resourceId,
        sport,
        startDateTime,
        endDateTime,
        price,
        status: "scheduled",
      });

      res.status(201).json({ message: "Trening je uspesno zakazan", training });
    } catch (error) {
      console.error("Zakazivanje treninga nije uspelo:", error);
      res.status(500).json({ message: "Zakazivanje treninga nije uspelo" });
    }
  };

  getByAthlete = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    try {
      const trainings = await TrainingModel.find({ athleteUsername: username }).sort({
        startDateTime: -1,
      });
      const result = await this.addTrainingDetails(trainings);
      res.json(result);
    } catch (error) {
      console.error("Ucitavanje treninga sportiste nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje treninga sportiste nije uspelo" });
    }
  };

  getByFacility = async (req: express.Request, res: express.Response) => {
    let facilityId = req.params.id;
    let employeeUsernameValue = req.query.employeeUsername;
    let employeeUsername = "";

    if (typeof employeeUsernameValue === "string") {
      employeeUsername = employeeUsernameValue.trim();
    }

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername) {
      res.status(400).json({ message: "ID objekta i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({
        _id: facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Zaposleni ne upravlja ovim objektom" });
        return;
      }

      const trainings = await TrainingModel.find({ facilityId }).sort({ startDateTime: -1 });
      const result = await this.addTrainingDetails(trainings);
      res.json(result);
    } catch (error) {
      console.error("Ucitavanje treninga objekta nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje treninga objekta nije uspelo" });
    }
  };

  markAttendance = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let attended = req.body.attended;

    if (!mongoose.isValidObjectId(id) || !employeeUsername || typeof attended !== "boolean") {
      res.status(400).json({ message: "Podaci o dolasku nisu ispravni" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const training = await TrainingModel.findOne({ _id: id, status: "scheduled" });

      if (!training) {
        res.status(404).json({ message: "Zakazan trening nije pronadjen" });
        return;
      }

      const employee = await UserModel.findOne({
        username: employeeUsername,
        role: "employee",
        status: "active",
      });
      const facility = await FacilityModel.findOne({
        _id: training.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!employee || !facility) {
        res.status(403).json({ message: "Zaposleni ne moze da izmeni ovaj trening" });
        return;
      }

      const now = new Date();
      const attendanceDeadline = new Date(training.startDateTime.getTime() + 10 * 60 * 1000);

      if (now < training.startDateTime || now > attendanceDeadline) {
        res.status(400).json({ message: "Dolazak se moze oznaciti samo u dozvoljenom vremenskom periodu" });
        return;
      }

      training.status = attended ? "attended" : "no_show";
      await training.save();
      res.json({ message: "Dolazak na trening je uspesno izmenjen", training });
    } catch (error) {
      console.error("Izmena dolaska na trening nije uspela:", error);
      res.status(500).json({ message: "Izmena dolaska na trening nije uspela" });
    }
  };

  moveTraining = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let startDateTimeValue = req.body.startDateTime;
    let endDateTimeValue = req.body.endDateTime;
    let startDateTime = new Date(startDateTimeValue);
    let endDateTime = new Date(endDateTimeValue);

    if (!mongoose.isValidObjectId(id) || !employeeUsername) {
      res.status(400).json({ message: "ID treninga i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const training = await TrainingModel.findOne({ _id: id, status: "scheduled" });

      if (!training) {
        res.status(404).json({ message: "Zakazan trening nije pronadjen" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: training.facilityId,
        employeeUsernames: employeeUsername,
      });
      const resource = facility?.resources.find(
        (item) => item._id.toString() === training.resourceId.toString(),
      );

      if (!facility || !resource) {
        res.status(403).json({ message: "Zaposleni ne moze da premesti ovaj trening" });
        return;
      }

      if (!["indoor", "hall"].includes(resource.type)) {
        res.status(400).json({ message: "Mogu se premestati samo treninzi u zatvorenom prostoru" });
        return;
      }

      const validation = await validateTraining(
        training.trainerId.toString(),
        training.facilityId.toString(),
        training.resourceId.toString(),
        training.sport,
        startDateTime,
        endDateTime,
        training._id.toString(),
      );

      if (validation.message) {
        res.status(400).json({ message: validation.message });
        return;
      }

      training.startDateTime = startDateTime;
      training.endDateTime = endDateTime;
      await training.save();
      res.json({ message: "Trening je uspesno premesten", training });
    } catch (error) {
      console.error("Premestanje treninga nije uspelo:", error);
      res.status(500).json({ message: "Premestanje treninga nije uspelo" });
    }
  };

  private addTrainingDetails = async (trainings: any[]) => {
    const result = [];

    for (const training of trainings) {
      const trainer = await TrainerModel.findById(training.trainerId);
      const facility = await FacilityModel.findById(training.facilityId);
      const resource = facility?.resources.find(
        (item) => item._id.toString() === training.resourceId.toString(),
      );

      result.push({
        ...training.toObject(),
        trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : "",
        facilityName: facility?.name || "",
        resourceName: resource?.name || "",
      });
    }

    return result;
  };

}
