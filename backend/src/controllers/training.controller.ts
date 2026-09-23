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
      console.error("Ucitavanje trenera nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje trenera nije uspelo" });
    }
  };

  deactivateTrainer = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "ID trenera nije ispravan" });
      return;
    }

    try {
      const trainer = await TrainerModel.findByIdAndUpdate(id, { active: false }, { new: true });

      if (!trainer) {
        res.status(404).json({ message: "Trener nije pronadjen" });
        return;
      }

      res.json({ message: "Trener je uspesno deaktiviran" });
    } catch (error) {
      console.error("Deaktiviranje trenera nije uspelo:", error);
      res.status(500).json({ message: "Deaktiviranje trenera nije uspelo" });
    }
  };

  searchTrainers = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let sport = req.body.sport;

    if (!mongoose.isValidObjectId(facilityId) || !sport) {
      res.status(400).json({ message: "Objekat i sport su obavezni" });
      return;
    }

    sport = sport.trim();

    try {
      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Aktivan objekat nije pronadjen" });
        return;
      }

      const trainers = await TrainerModel.find({
        facilityId,
        sports: sport,
        active: true,
      }).sort({ averageRating: -1, lastName: 1 });

      res.json(trainers);
    } catch (error) {
      console.error("Pretraga trenera nije uspela:", error);
      res.status(500).json({ message: "Pretraga trenera nije uspela" });
    }
  };

  getTrainerSchedule = async (req: express.Request, res: express.Response) => {
    let trainerId = req.body.trainerId;

    if (!mongoose.isValidObjectId(trainerId)) {
      res.status(400).json({ message: "ID trenera nije ispravan" });
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
      console.error("Ucitavanje rasporeda trenera nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje rasporeda trenera nije uspelo" });
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
      res.json({ message: "Trening je uspesno premesten", training });
    } catch (error) {
      console.error("Premestanje treninga nije uspelo:", error);
      res.status(500).json({ message: "Premestanje treninga nije uspelo" });
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
      return { message: "ID trenera, objekta ili terena nije ispravan", pricePerHour: 0 };
    }

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { message: "Datum i vreme treninga nisu ispravni", pricePerHour: 0 };
    }

    if (startDateTime <= new Date()) {
      return { message: "Trening mora poceti u buducnosti", pricePerHour: 0 };
    }

    if (
      startDateTime.getMinutes() !== 0 ||
      startDateTime.getSeconds() !== 0 ||
      endDateTime.getMinutes() !== 0 ||
      endDateTime.getSeconds() !== 0
    ) {
      return { message: "Trening mora poceti i zavrsiti se na pun sat", pricePerHour: 0 };
    }

    const duration = endDateTime.getTime() - startDateTime.getTime();

    if (duration < hourInMilliseconds || duration % hourInMilliseconds !== 0) {
      return { message: "Trening mora trajati jedan ili vise punih sati", pricePerHour: 0 };
    }

    if (
      startDateTime.getFullYear() !== endDateTime.getFullYear() ||
      startDateTime.getMonth() !== endDateTime.getMonth() ||
      startDateTime.getDate() !== endDateTime.getDate()
    ) {
      return { message: "Trening mora poceti i zavrsiti se istog dana", pricePerHour: 0 };
    }

    const trainer = await TrainerModel.findOne({
      _id: trainerId,
      facilityId,
      sports: sport,
      active: true,
    });

    if (!trainer) {
      return { message: "Aktivan trener za izabrani sport nije pronadjen", pricePerHour: 0 };
    }

    const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

    if (!facility) {
      return { message: "Aktivan objekat nije pronadjen", pricePerHour: 0 };
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
          message: "Sportista je dostigao dozvoljeni broj nedolazaka za ovaj objekat",
          pricePerHour: 0,
        };
      }
    }

    const resource = facility.resources.find((item) => item._id.toString() === resourceId);

    if (!resource || !resource.sportPrices.some((item) => item.sport === sport)) {
      return { message: "Izabrani teren ne podrzava ovaj sport", pricePerHour: 0 };
    }

    const javascriptDay = startDateTime.getDay();
    const day = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item) => item.day === day);

    if (!workingHours) {
      return { message: "Objekat ne radi izabranog dana", pricePerHour: 0 };
    }

    const startMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
    const endMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();

    if (
      startMinutes < this.timeToMinutes(workingHours.from) ||
      endMinutes > this.timeToMinutes(workingHours.to)
    ) {
      return { message: "Trening mora biti u okviru radnog vremena objekta", pricePerHour: 0 };
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
      return { message: "Trener nije dostupan u izabranom terminu", pricePerHour: 0 };
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
      return { message: "Teren je zauzet drugim treningom", pricePerHour: 0 };
    }

    const overlappingReservation = await ReservationModel.findOne({
      resourceId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    });

    if (overlappingReservation) {
      return { message: "Teren je zauzet rezervacijom", pricePerHour: 0 };
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
