import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import OrderModel from "../models/order";
import ReservationModel from "../models/reservation";
import TrainingModel from "../models/training";
import UserModel from "../models/user";

const hourInMilliseconds = 60 * 60 * 1000;

export class ReservationController {
  getStatistics = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    if (!username) {
      res.status(400).json({ message: "Korisnicko ime sportiste je obavezno" });
      return;
    }

    try {
      const playedBySportResult = await ReservationModel.aggregate([
        { $match: { athleteUsername: username, status: "attended" } },
        { $group: { _id: "$sport", value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      const reservedBySportResult = await ReservationModel.aggregate([
        { $match: { athleteUsername: username, status: { $ne: "cancelled" } } },
        { $group: { _id: "$sport", value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      const reservationsByMonthResult = await ReservationModel.aggregate([
        { $match: { athleteUsername: username, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: {
              year: { $year: "$startDateTime" },
              month: { $month: "$startDateTime" },
            },
            value: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);
      const spendingResult = await OrderModel.aggregate([
        { $match: { status: "collected" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);

      const playedBySport = playedBySportResult.map((item) => ({
        label: item._id,
        value: item.value,
      }));
      const reservedBySport = reservedBySportResult.map((item) => ({
        label: item._id,
        value: item.value,
      }));
      const reservationsByMonth = reservationsByMonthResult.map((item) => ({
        label: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        value: item.value,
      }));

      res.json({
        playedBySport,
        reservedBySport,
        reservationsByMonth,
        totalEquipmentSpending: spendingResult[0]?.total || 0,
      });
    } catch (error) {
      console.error("Ucitavanje statistike sportiste nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje statistike sportiste nije uspelo" });
    }
  };

  getSchedule = async (req: express.Request, res: express.Response) => {
    let resourceId = req.body.resourceId;
    let rangeStartValue = req.body.rangeStart;
    let rangeEndValue = req.body.rangeEnd;
    let rangeStart = new Date(rangeStartValue);
    let rangeEnd = new Date(rangeEndValue);

    if (
      !mongoose.isValidObjectId(resourceId) ||
      isNaN(rangeStart.getTime()) ||
      isNaN(rangeEnd.getTime()) ||
      rangeStart >= rangeEnd
    ) {
      res.status(400).json({ message: "Parametri rasporeda nisu ispravni" });
      return;
    }

    try {
      const reservations = await ReservationModel.find({
        resourceId,
        status: "scheduled",
        startDateTime: { $lt: rangeEnd },
        endDateTime: { $gt: rangeStart },
      }).sort({ startDateTime: 1 });

      const trainings = await TrainingModel.find({
        resourceId,
        status: "scheduled",
        startDateTime: { $lt: rangeEnd },
        endDateTime: { $gt: rangeStart },
      }).sort({ startDateTime: 1 });

      const schedule = [
        ...reservations.map((reservation) => ({
          _id: reservation._id,
          startDateTime: reservation.startDateTime,
          endDateTime: reservation.endDateTime,
          type: "reservation",
        })),
        ...trainings.map((training) => ({
          _id: training._id,
          startDateTime: training.startDateTime,
          endDateTime: training.endDateTime,
          type: "training",
        })),
      ].sort(
        (first, second) =>
          new Date(first.startDateTime).getTime() - new Date(second.startDateTime).getTime(),
      );

      res.json(schedule);
    } catch (error) {
      console.error("Ucitavanje rasporeda rezervacija nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje rasporeda rezervacija nije uspelo" });
    }
  };

  create = async (req: express.Request, res: express.Response) => {
    let athleteUsername = req.body.athleteUsername;
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

      const validation = await this.validateReservation(
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

      const reservation = await ReservationModel.create({
        athleteUsername,
        facilityId,
        resourceId,
        sport,
        startDateTime,
        endDateTime,
        price,
        status: "scheduled",
      });

      res.status(201).json({ message: "Rezervacija je uspesno kreirana", reservation });
    } catch (error) {
      console.error("Kreiranje rezervacije nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje rezervacije nije uspelo" });
    }
  };

  getAthleteReservations = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    try {
      const reservations = await ReservationModel.find({ athleteUsername: username }).sort({
        startDateTime: -1,
      });
      const facilityIds = [...new Set(reservations.map((item) => item.facilityId.toString()))];
      const facilities = await FacilityModel.find({ _id: { $in: facilityIds } });

      const result = reservations.map((reservation) => {
        const facility = facilities.find(
          (item) => item._id.toString() === reservation.facilityId.toString(),
        );
        const resource = facility?.resources.find(
          (item) => item._id.toString() === reservation.resourceId.toString(),
        );

        return {
          _id: reservation._id,
          athleteUsername: reservation.athleteUsername,
          facilityId: reservation.facilityId,
          resourceId: reservation.resourceId,
          sport: reservation.sport,
          startDateTime: reservation.startDateTime,
          endDateTime: reservation.endDateTime,
          price: reservation.price,
          status: reservation.status,
          facilityName: facility?.name || "",
          city: facility?.city || "",
          resourceName: resource?.name || "",
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Ucitavanje rezervacija sportiste nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje rezervacija sportiste nije uspelo" });
    }
  };

  getFacilityReservations = async (req: express.Request, res: express.Response) => {
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

      const reservations = await ReservationModel.find({ facilityId }).sort({
        startDateTime: -1,
      });
      const result = reservations.map((reservation) => {
        const resource = facility.resources.find(
          (item) => item._id.toString() === reservation.resourceId.toString(),
        );

        return {
          ...reservation.toObject(),
          resourceName: resource?.name || "",
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Ucitavanje rezervacija objekta nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje rezervacija objekta nije uspelo" });
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
      const reservation = await ReservationModel.findOne({ _id: id, status: "scheduled" });

      if (!reservation) {
        res.status(404).json({ message: "Zakazana rezervacija nije pronadjena" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: reservation.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Zaposleni ne moze da izmeni ovu rezervaciju" });
        return;
      }

      const now = new Date();
      const attendanceDeadline = new Date(reservation.startDateTime.getTime() + 10 * 60 * 1000);

      if (now < reservation.startDateTime || now > attendanceDeadline) {
        res.status(400).json({ message: "Dolazak se moze oznaciti samo u dozvoljenom vremenskom periodu" });
        return;
      }

      reservation.status = attended ? "attended" : "no_show";
      await reservation.save();
      res.json({ message: "Dolazak na rezervaciju je uspesno izmenjen", reservation });
    } catch (error) {
      console.error("Izmena dolaska na rezervaciju nije uspela:", error);
      res.status(500).json({ message: "Izmena dolaska na rezervaciju nije uspela" });
    }
  };

  move = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let startDateTimeValue = req.body.startDateTime;
    let endDateTimeValue = req.body.endDateTime;
    let startDateTime = new Date(startDateTimeValue);
    let endDateTime = new Date(endDateTimeValue);

    if (!mongoose.isValidObjectId(id) || !employeeUsername) {
      res.status(400).json({ message: "ID rezervacije i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const reservation = await ReservationModel.findOne({ _id: id, status: "scheduled" });

      if (!reservation) {
        res.status(404).json({ message: "Zakazana rezervacija nije pronadjena" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: reservation.facilityId,
        employeeUsernames: employeeUsername,
      });
      const resource = facility?.resources.find(
        (item) => item._id.toString() === reservation.resourceId.toString(),
      );

      if (!facility || !resource) {
        res.status(403).json({ message: "Zaposleni ne moze da premesti ovu rezervaciju" });
        return;
      }

      if (!["indoor", "hall"].includes(resource.type)) {
        res.status(400).json({ message: "Mogu se premestati samo rezervacije zatvorenih terena" });
        return;
      }

      const validation = await this.validateReservation(
        reservation.facilityId.toString(),
        reservation.resourceId.toString(),
        reservation.sport,
        startDateTime,
        endDateTime,
        reservation._id.toString(),
      );

      if (validation.message) {
        res.status(400).json({ message: validation.message });
        return;
      }

      reservation.startDateTime = startDateTime;
      reservation.endDateTime = endDateTime;
      await reservation.save();
      res.json({ message: "Rezervacija je uspesno premestena", reservation });
    } catch (error) {
      console.error("Premestanje rezervacije nije uspelo:", error);
      res.status(500).json({ message: "Premestanje rezervacije nije uspelo" });
    }
  };

  cancel = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "ID rezervacije i korisnicko ime sportiste su obavezni" });
      return;
    }

    athleteUsername = athleteUsername.trim();

    try {
      const reservation = await ReservationModel.findOne({
        _id: id,
        athleteUsername,
        status: "scheduled",
      });

      if (!reservation) {
        res.status(404).json({ message: "Zakazana rezervacija nije pronadjena" });
        return;
      }

      const hoursUntilStart =
        (reservation.startDateTime.getTime() - Date.now()) / hourInMilliseconds;

      if (hoursUntilStart < 12) {
        res.status(400).json({ message: "Rezervacija se moze otkazati najkasnije 12 sati pre pocetka" });
        return;
      }

      reservation.status = "cancelled";
      await reservation.save();
      res.json({ message: "Rezervacija je uspesno otkazana" });
    } catch (error) {
      console.error("Otkazivanje rezervacije nije uspelo:", error);
      res.status(500).json({ message: "Otkazivanje rezervacije nije uspelo" });
    }
  };

  private validateReservation = async (
    facilityId: string,
    resourceId: string,
    sport: string,
    startDateTime: Date,
    endDateTime: Date,
    reservationId = "",
    athleteUsername = "",
  ) => {
    if (!mongoose.isValidObjectId(facilityId) || !mongoose.isValidObjectId(resourceId)) {
      return { message: "ID objekta ili terena nije ispravan", pricePerHour: 0 };
    }

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { message: "Datum i vreme rezervacije nisu ispravni", pricePerHour: 0 };
    }

    if (startDateTime <= new Date()) {
      return { message: "Rezervacija mora poceti u buducnosti", pricePerHour: 0 };
    }

    if (
      startDateTime.getMinutes() !== 0 ||
      startDateTime.getSeconds() !== 0 ||
      endDateTime.getMinutes() !== 0 ||
      endDateTime.getSeconds() !== 0
    ) {
      return { message: "Rezervacija mora poceti i zavrsiti se na pun sat", pricePerHour: 0 };
    }

    const duration = endDateTime.getTime() - startDateTime.getTime();

    if (duration < hourInMilliseconds || duration % hourInMilliseconds !== 0) {
      return { message: "Rezervacija mora trajati jedan ili vise punih sati", pricePerHour: 0 };
    }

    if (
      startDateTime.getFullYear() !== endDateTime.getFullYear() ||
      startDateTime.getMonth() !== endDateTime.getMonth() ||
      startDateTime.getDate() !== endDateTime.getDate()
    ) {
      return { message: "Rezervacija mora poceti i zavrsiti se istog dana", pricePerHour: 0 };
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

    if (!resource) {
      return { message: "Teren nije pronadjen u ovom objektu", pricePerHour: 0 };
    }

    const sportPrice = resource.sportPrices.find((item) => item.sport === sport);

    if (!sportPrice) {
      return { message: "Izabrani sport nije dostupan na ovom terenu", pricePerHour: 0 };
    }

    const javascriptDay = startDateTime.getDay();
    const day = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item) => item.day === day);

    if (!workingHours) {
      return { message: "Objekat ne radi izabranog dana", pricePerHour: 0 };
    }

    const startMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
    const endMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();
    const workingStart = this.timeToMinutes(workingHours.from);
    const workingEnd = this.timeToMinutes(workingHours.to);

    if (startMinutes < workingStart || endMinutes > workingEnd) {
      return { message: "Rezervacija mora biti u okviru radnog vremena objekta", pricePerHour: 0 };
    }

    const reservationQuery: any = {
      resourceId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    };

    if (reservationId) {
      reservationQuery._id = { $ne: reservationId };
    }

    const overlappingReservation = await ReservationModel.findOne(reservationQuery);

    if (overlappingReservation) {
      return { message: "Izabrani termin se preklapa sa postojecom rezervacijom", pricePerHour: 0 };
    }

    const overlappingTraining = await TrainingModel.findOne({
      resourceId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    });

    if (overlappingTraining) {
      return { message: "Izabrani termin se preklapa sa individualnim treningom", pricePerHour: 0 };
    }

    return { message: "", pricePerHour: sportPrice.pricePerHour };
  };

  private timeToMinutes = (time: string) => {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };
}
