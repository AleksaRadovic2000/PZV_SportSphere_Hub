import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import ReservationModel from "../models/reservation";
import TrainerModel from "../models/trainer";
import TrainingModel from "../models/training";
import UserModel from "../models/user";

const hourInMilliseconds = 60 * 60 * 1000;

export class TrainingController {
  getAllTrainers = async (_req: express.Request, res: express.Response) => {
    try {
      const trainers = await TrainerModel.find({}).sort({ lastName: 1, firstName: 1 });
      const facilityIds = [...new Set(trainers.map((trainer) => trainer.facilityId.toString()))];
      const facilities = await FacilityModel.find({ _id: { $in: facilityIds } });
      const result = trainers.map((trainer) => {
        const facility = facilities.find(
          (item) => item._id.toString() === trainer.facilityId.toString(),
        );

        return {
          ...trainer.toObject(),
          facilityName: facility?.name || "",
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Failed to load trainers:", error);
      res.status(500).json({ message: "Failed to load trainers" });
    }
  };

  deactivateTrainer = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Trainer ID is not valid" });
      return;
    }

    try {
      const trainer = await TrainerModel.findByIdAndUpdate(id, { active: false }, { new: true });

      if (!trainer) {
        res.status(404).json({ message: "Trainer was not found" });
        return;
      }

      res.json({ message: "Trainer deactivated successfully" });
    } catch (error) {
      console.error("Trainer deactivation failed:", error);
      res.status(500).json({ message: "Trainer deactivation failed" });
    }
  };

  searchTrainers = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let sport = req.body.sport;

    if (!mongoose.isValidObjectId(facilityId) || !sport) {
      res.status(400).json({ message: "Facility and sport are required" });
      return;
    }

    sport = sport.trim();

    try {
      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Active facility was not found" });
        return;
      }

      const trainers = await TrainerModel.find({
        facilityId,
        sports: sport,
        active: true,
      }).sort({ averageRating: -1, lastName: 1 });

      res.json(trainers);
    } catch (error) {
      console.error("Trainer search failed:", error);
      res.status(500).json({ message: "Trainer search failed" });
    }
  };

  getTrainerSchedule = async (req: express.Request, res: express.Response) => {
    let trainerId = req.body.trainerId;

    if (!mongoose.isValidObjectId(trainerId)) {
      res.status(400).json({ message: "Trainer ID is not valid" });
      return;
    }

    try {
      const trainings = await TrainingModel.find({
        trainerId,
        status: "scheduled",
        startDateTime: { $gt: new Date() },
      }).sort({ startDateTime: 1 });

      const schedule = trainings.map((training) => ({
        _id: training._id,
        startDateTime: training.startDateTime,
        endDateTime: training.endDateTime,
      }));

      res.json(schedule);
    } catch (error) {
      console.error("Failed to load trainer schedule:", error);
      res.status(500).json({ message: "Failed to load trainer schedule" });
    }
  };

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
      res.status(400).json({ message: "Athlete username and sport are required" });
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
        res.status(404).json({ message: "Active athlete was not found" });
        return;
      }

      const validation = await this.validateTraining(
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

      res.status(201).json({ message: "Training scheduled successfully", training });
    } catch (error) {
      console.error("Training scheduling failed:", error);
      res.status(500).json({ message: "Training scheduling failed" });
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
      console.error("Failed to load athlete trainings:", error);
      res.status(500).json({ message: "Failed to load athlete trainings" });
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
      res.status(400).json({ message: "Facility ID and employee username are required" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({
        _id: facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Employee does not manage this facility" });
        return;
      }

      const trainings = await TrainingModel.find({ facilityId }).sort({ startDateTime: -1 });
      const result = await this.addTrainingDetails(trainings);
      res.json(result);
    } catch (error) {
      console.error("Failed to load facility trainings:", error);
      res.status(500).json({ message: "Failed to load facility trainings" });
    }
  };

  markAttendance = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let attended = req.body.attended;

    if (!mongoose.isValidObjectId(id) || !employeeUsername || typeof attended !== "boolean") {
      res.status(400).json({ message: "Attendance data is not valid" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const training = await TrainingModel.findOne({ _id: id, status: "scheduled" });

      if (!training) {
        res.status(404).json({ message: "Scheduled training was not found" });
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
        res.status(403).json({ message: "Employee cannot update this training" });
        return;
      }

      const now = new Date();
      const attendanceDeadline = new Date(training.startDateTime.getTime() + 10 * 60 * 1000);

      if (now < training.startDateTime || now > attendanceDeadline) {
        res.status(400).json({ message: "Attendance can be marked during the allowed time window" });
        return;
      }

      training.status = attended ? "attended" : "no_show";
      await training.save();
      res.json({ message: "Training attendance updated successfully", training });
    } catch (error) {
      console.error("Training attendance update failed:", error);
      res.status(500).json({ message: "Training attendance update failed" });
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
      res.status(400).json({ message: "Training ID and employee username are required" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const training = await TrainingModel.findOne({ _id: id, status: "scheduled" });

      if (!training) {
        res.status(404).json({ message: "Scheduled training was not found" });
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
        res.status(403).json({ message: "Employee cannot move this training" });
        return;
      }

      if (!["indoor", "hall"].includes(resource.type)) {
        res.status(400).json({ message: "Only indoor trainings can be moved" });
        return;
      }

      const validation = await this.validateTraining(
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
      res.json({ message: "Training moved successfully", training });
    } catch (error) {
      console.error("Training move failed:", error);
      res.status(500).json({ message: "Training move failed" });
    }
  };

  private validateTraining = async (
    trainerId: string,
    facilityId: string,
    resourceId: string,
    sport: string,
    startDateTime: Date,
    endDateTime: Date,
    trainingId = "",
    athleteUsername = "",
  ) => {
    if (
      !mongoose.isValidObjectId(trainerId) ||
      !mongoose.isValidObjectId(facilityId) ||
      !mongoose.isValidObjectId(resourceId)
    ) {
      return { message: "Trainer, facility or resource ID is not valid", pricePerHour: 0 };
    }

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { message: "Training date and time are not valid", pricePerHour: 0 };
    }

    if (startDateTime <= new Date()) {
      return { message: "Training must start in the future", pricePerHour: 0 };
    }

    if (
      startDateTime.getMinutes() !== 0 ||
      startDateTime.getSeconds() !== 0 ||
      endDateTime.getMinutes() !== 0 ||
      endDateTime.getSeconds() !== 0
    ) {
      return { message: "Training must start and end on a full hour", pricePerHour: 0 };
    }

    const duration = endDateTime.getTime() - startDateTime.getTime();

    if (duration < hourInMilliseconds || duration % hourInMilliseconds !== 0) {
      return { message: "Training must last one or more whole hours", pricePerHour: 0 };
    }

    if (
      startDateTime.getFullYear() !== endDateTime.getFullYear() ||
      startDateTime.getMonth() !== endDateTime.getMonth() ||
      startDateTime.getDate() !== endDateTime.getDate()
    ) {
      return { message: "Training must start and end on the same day", pricePerHour: 0 };
    }

    const trainer = await TrainerModel.findOne({
      _id: trainerId,
      facilityId,
      sports: sport,
      active: true,
    });

    if (!trainer) {
      return { message: "Active trainer for selected sport was not found", pricePerHour: 0 };
    }

    const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

    if (!facility) {
      return { message: "Active facility was not found", pricePerHour: 0 };
    }

    if (athleteUsername) {
      const reservationNoShows = await ReservationModel.countDocuments({
        athleteUsername,
        facilityId,
        status: "no_show",
      });
      const trainingNoShows = await TrainingModel.countDocuments({
        athleteUsername,
        facilityId,
        status: "no_show",
      });

      if (reservationNoShows + trainingNoShows >= facility.allowedNoShows) {
        return {
          message: "Athlete has reached the allowed number of no-shows for this facility",
          pricePerHour: 0,
        };
      }
    }

    const resource = facility.resources.find((item) => item._id.toString() === resourceId);

    if (!resource || !resource.sportPrices.some((item) => item.sport === sport)) {
      return { message: "Selected resource does not support this sport", pricePerHour: 0 };
    }

    const javascriptDay = startDateTime.getDay();
    const day = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item) => item.day === day);

    if (!workingHours) {
      return { message: "Facility does not work on the selected day", pricePerHour: 0 };
    }

    const startMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
    const endMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();

    if (
      startMinutes < this.timeToMinutes(workingHours.from) ||
      endMinutes > this.timeToMinutes(workingHours.to)
    ) {
      return { message: "Training must be within facility working hours", pricePerHour: 0 };
    }

    const trainerTrainingQuery: any = {
      trainerId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    };

    if (trainingId) {
      trainerTrainingQuery._id = { $ne: trainingId };
    }

    const overlappingTrainerTraining = await TrainingModel.findOne(trainerTrainingQuery);

    if (overlappingTrainerTraining) {
      return { message: "Trainer is not available at the selected time", pricePerHour: 0 };
    }

    const resourceTrainingQuery: any = {
      resourceId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    };

    if (trainingId) {
      resourceTrainingQuery._id = { $ne: trainingId };
    }

    const overlappingResourceTraining = await TrainingModel.findOne(resourceTrainingQuery);

    if (overlappingResourceTraining) {
      return { message: "Resource is occupied by another training", pricePerHour: 0 };
    }

    const overlappingReservation = await ReservationModel.findOne({
      resourceId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    });

    if (overlappingReservation) {
      return { message: "Resource is occupied by a reservation", pricePerHour: 0 };
    }

    return { message: "", pricePerHour: trainer.pricePerHour };
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

  private timeToMinutes = (time: string) => {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };
}
