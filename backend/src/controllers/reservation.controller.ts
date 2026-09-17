import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import ReservationModel from "../models/reservation";
import UserModel from "../models/user";

const hourInMilliseconds = 60 * 60 * 1000;

export class ReservationController {
  getSchedule = async (req: express.Request, res: express.Response) => {
    let resourceId = req.body.resourceId;
    let rangeStart = new Date(req.body.rangeStart);
    let rangeEnd = new Date(req.body.rangeEnd);

    if (
      !mongoose.isValidObjectId(resourceId) ||
      isNaN(rangeStart.getTime()) ||
      isNaN(rangeEnd.getTime()) ||
      rangeStart >= rangeEnd
    ) {
      res.status(400).json({ message: "Schedule parameters are not valid" });
      return;
    }

    try {
      const reservations = await ReservationModel.find({
        resourceId,
        status: "scheduled",
        startDateTime: { $lt: rangeEnd },
        endDateTime: { $gt: rangeStart },
      }).sort({ startDateTime: 1 });

      res.json(reservations);
    } catch (error) {
      console.error("Failed to load reservation schedule:", error);
      res.status(500).json({ message: "Failed to load reservation schedule" });
    }
  };

  create = async (req: express.Request, res: express.Response) => {
    let athleteUsername = req.body.athleteUsername;
    let facilityId = req.body.facilityId;
    let resourceId = req.body.resourceId;
    let sport = req.body.sport;
    let startDateTime = new Date(req.body.startDateTime);
    let endDateTime = new Date(req.body.endDateTime);

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

      const validation = await this.validateReservation(
        facilityId,
        resourceId,
        sport,
        startDateTime,
        endDateTime,
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

      res.status(201).json({ message: "Reservation created successfully", reservation });
    } catch (error) {
      console.error("Reservation creation failed:", error);
      res.status(500).json({ message: "Reservation creation failed" });
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
      console.error("Failed to load athlete reservations:", error);
      res.status(500).json({ message: "Failed to load athlete reservations" });
    }
  };

  cancel = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "Reservation ID and athlete username are required" });
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
        res.status(404).json({ message: "Scheduled reservation was not found" });
        return;
      }

      const hoursUntilStart =
        (reservation.startDateTime.getTime() - Date.now()) / hourInMilliseconds;

      if (hoursUntilStart < 12) {
        res.status(400).json({ message: "Reservation can be cancelled at least 12 hours before start" });
        return;
      }

      reservation.status = "cancelled";
      await reservation.save();
      res.json({ message: "Reservation cancelled successfully" });
    } catch (error) {
      console.error("Reservation cancellation failed:", error);
      res.status(500).json({ message: "Reservation cancellation failed" });
    }
  };

  private validateReservation = async (
    facilityId: string,
    resourceId: string,
    sport: string,
    startDateTime: Date,
    endDateTime: Date,
  ) => {
    if (!mongoose.isValidObjectId(facilityId) || !mongoose.isValidObjectId(resourceId)) {
      return { message: "Facility or resource ID is not valid", pricePerHour: 0 };
    }

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { message: "Reservation date and time are not valid", pricePerHour: 0 };
    }

    if (startDateTime <= new Date()) {
      return { message: "Reservation must start in the future", pricePerHour: 0 };
    }

    if (
      startDateTime.getMinutes() !== 0 ||
      startDateTime.getSeconds() !== 0 ||
      endDateTime.getMinutes() !== 0 ||
      endDateTime.getSeconds() !== 0
    ) {
      return { message: "Reservation must start and end on a full hour", pricePerHour: 0 };
    }

    const duration = endDateTime.getTime() - startDateTime.getTime();

    if (duration < hourInMilliseconds || duration % hourInMilliseconds !== 0) {
      return { message: "Reservation must last one or more whole hours", pricePerHour: 0 };
    }

    if (
      startDateTime.getFullYear() !== endDateTime.getFullYear() ||
      startDateTime.getMonth() !== endDateTime.getMonth() ||
      startDateTime.getDate() !== endDateTime.getDate()
    ) {
      return { message: "Reservation must start and end on the same day", pricePerHour: 0 };
    }

    const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

    if (!facility) {
      return { message: "Active facility was not found", pricePerHour: 0 };
    }

    const resource = facility.resources.find((item) => item._id.toString() === resourceId);

    if (!resource) {
      return { message: "Resource was not found in this facility", pricePerHour: 0 };
    }

    const sportPrice = resource.sportPrices.find((item) => item.sport === sport);

    if (!sportPrice) {
      return { message: "Selected sport is not available on this resource", pricePerHour: 0 };
    }

    const javascriptDay = startDateTime.getDay();
    const day = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item) => item.day === day);

    if (!workingHours) {
      return { message: "Facility does not work on the selected day", pricePerHour: 0 };
    }

    const startMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
    const endMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();
    const workingStart = this.timeToMinutes(workingHours.from);
    const workingEnd = this.timeToMinutes(workingHours.to);

    if (startMinutes < workingStart || endMinutes > workingEnd) {
      return { message: "Reservation must be within facility working hours", pricePerHour: 0 };
    }

    const overlappingReservation = await ReservationModel.findOne({
      resourceId,
      status: "scheduled",
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime },
    });

    if (overlappingReservation) {
      return { message: "Selected time overlaps an existing reservation", pricePerHour: 0 };
    }

    return { message: "", pricePerHour: sportPrice.pricePerHour };
  };

  private timeToMinutes = (time: string) => {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };
}
