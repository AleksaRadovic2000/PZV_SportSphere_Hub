import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import OrderModel from "../models/order";
import ReservationModel from "../models/reservation";
import TrainingModel from "../models/training";
import {
  createOccupancyDocument,
  createSalesDocument,
  OccupancyRow,
  SalesRow,
} from "../utils/pdf-report";

const hourInMilliseconds = 60 * 60 * 1000;

export class ReportController {
  occupancy = async (req: express.Request, res: express.Response) => {
    let facilityIdValue = req.query.facilityId;
    let employeeUsernameValue = req.query.employeeUsername;
    let monthValue = req.query.month;
    let facilityId = typeof facilityIdValue === "string" ? facilityIdValue : "";
    let employeeUsername =
      typeof employeeUsernameValue === "string" ? employeeUsernameValue.trim() : "";
    let month = typeof monthValue === "string" ? monthValue : "";
    const period = this.getMonthPeriod(month);

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername || !period) {
      res.status(400).json({ message: "Parametri izvestaja nisu ispravni" });
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

      const reservations = await ReservationModel.find({
        facilityId,
        status: { $ne: "cancelled" },
        startDateTime: { $lt: period.end },
        endDateTime: { $gt: period.start },
      });
      const trainings = await TrainingModel.find({
        facilityId,
        status: { $ne: "cancelled" },
        startDateTime: { $lt: period.end },
        endDateTime: { $gt: period.start },
      });
      const availableHours = this.getAvailableHours(facility.workingHours, period.start, period.end);
      const rows: OccupancyRow[] = facility.resources.map((resource) => {
        let occupiedHours = 0;

        reservations.forEach((reservation) => {
          if (reservation.resourceId.toString() === resource._id.toString()) {
            occupiedHours += this.getHoursInPeriod(
              reservation.startDateTime,
              reservation.endDateTime,
              period.start,
              period.end,
            );
          }
        });

        trainings.forEach((training) => {
          if (training.resourceId.toString() === resource._id.toString()) {
            occupiedHours += this.getHoursInPeriod(
              training.startDateTime,
              training.endDateTime,
              period.start,
              period.end,
            );
          }
        });

        return {
          resourceName: resource.name,
          availableHours,
          occupiedHours,
          percentage: availableHours > 0 ? (occupiedHours / availableHours) * 100 : 0,
        };
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="popunjenost-${month}.pdf"`);
      const document = createOccupancyDocument(facility.name, month, rows);
      document.pipe(res);
      document.end();
    } catch (error) {
      console.error("Kreiranje izvestaja o zauzetosti nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje izvestaja o zauzetosti nije uspelo" });
    }
  };

  sales = async (req: express.Request, res: express.Response) => {
    let facilityIdValue = req.query.facilityId;
    let employeeUsernameValue = req.query.employeeUsername;
    let monthValue = req.query.month;
    let facilityId = typeof facilityIdValue === "string" ? facilityIdValue : "";
    let employeeUsername =
      typeof employeeUsernameValue === "string" ? employeeUsernameValue.trim() : "";
    let month = typeof monthValue === "string" ? monthValue : "";
    const period = this.getMonthPeriod(month);

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername || !period) {
      res.status(400).json({ message: "Parametri izvestaja nisu ispravni" });
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

      const orders = await OrderModel.find({
        facilityId,
        status: "collected",
        createdAt: { $gte: period.start, $lt: period.end },
      });
      const rowMap = new Map<string, SalesRow>();
      let total = 0;

      orders.forEach((order) => {
        order.items.forEach((item) => {
          const key = item.productId.toString();
          const amount = item.unitPrice * item.quantity;
          const row = rowMap.get(key);

          if (row) {
            row.quantity += item.quantity;
            row.amount += amount;
          } else {
            rowMap.set(key, {
              productName: item.productName,
              quantity: item.quantity,
              amount,
            });
          }

          total += amount;
        });
      });

      const rows = [...rowMap.values()].sort((first, second) =>
        first.productName.localeCompare(second.productName),
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="promet-${month}.pdf"`);
      const document = createSalesDocument(facility.name, month, rows, total);
      document.pipe(res);
      document.end();
    } catch (error) {
      console.error("Kreiranje izvestaja o prodaji nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje izvestaja o prodaji nije uspelo" });
    }
  };

  private getMonthPeriod = (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return null;
    }

    const parts = month.split("-");
    const year = Number(parts[0]);
    const monthIndex = Number(parts[1]) - 1;

    if (monthIndex < 0 || monthIndex > 11) {
      return null;
    }

    return {
      start: new Date(Date.UTC(year, monthIndex, 1)),
      end: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
  };

  private getAvailableHours = (workingHours: any[], start: Date, end: Date) => {
    let hours = 0;

    for (let date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
      const javascriptDay = date.getUTCDay();
      const day = javascriptDay === 0 ? 7 : javascriptDay;
      const workingDay = workingHours.find((item) => item.day === day);

      if (workingDay) {
        hours += (this.timeToMinutes(workingDay.to) - this.timeToMinutes(workingDay.from)) / 60;
      }
    }

    return hours;
  };

  private getHoursInPeriod = (start: Date, end: Date, periodStart: Date, periodEnd: Date) => {
    const clippedStart = Math.max(start.getTime(), periodStart.getTime());
    const clippedEnd = Math.min(end.getTime(), periodEnd.getTime());
    return Math.max(0, clippedEnd - clippedStart) / hourInMilliseconds;
  };

  private timeToMinutes = (time: string) => {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };
}
