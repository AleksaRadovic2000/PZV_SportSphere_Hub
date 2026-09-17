import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import FacilityReviewModel from "../models/facility-review";
import ReservationModel from "../models/reservation";

export class PublicFacilityController {
  getPublicInfo = async (_req: express.Request, res: express.Response) => {
    try {
      const activeCount = await FacilityModel.countDocuments({ status: "active" });
      const likeCounts = await FacilityReviewModel.aggregate([
        { $match: { reaction: "like" } },
        { $group: { _id: "$facilityId", likes: { $sum: 1 } } },
        { $sort: { likes: -1 } },
      ]);
      const activeFacilities = await FacilityModel.find({ status: "active" });

      const topFacilities = activeFacilities
        .map((facility) => {
          const review = likeCounts.find(
            (item) => item._id.toString() === facility._id.toString(),
          );

          return {
            _id: facility._id,
            name: facility.name,
            city: facility.city,
            likes: review?.likes || 0,
          };
        })
        .sort((first, second) => second.likes - first.likes)
        .slice(0, 3);

      res.json({ activeCount, topFacilities });
    } catch (error) {
      console.error("Failed to load public information:", error);
      res.status(500).json({ message: "Failed to load public information" });
    }
  };

  getCities = (_req: express.Request, res: express.Response) => {
    FacilityModel.distinct("city", { status: "active" })
      .then((cities) => res.json(cities.sort()))
      .catch((error) => {
        console.error("Failed to load cities:", error);
        res.status(500).json({ message: "Failed to load cities" });
      });
  };

  search = async (req: express.Request, res: express.Response) => {
    let name = req.body.name;
    let cities = req.body.cities;
    let sport = req.body.sport;
    let resourceType = req.body.resourceType;
    let onlyAvailableToday = req.body.onlyAvailableToday === true;
    let query: any = { status: "active" };

    if (typeof name === "string" && name.trim()) {
      query.name = { $regex: name.trim(), $options: "i" };
    }

    if (Array.isArray(cities) && cities.length > 0) {
      query.city = { $in: cities };
    }

    const selectedSport = typeof sport === "string" ? sport.trim() : "";
    const selectedTypes = resourceType === "indoor" ? ["indoor", "hall"] : [resourceType];

    if (selectedSport && ["outdoor", "indoor"].includes(resourceType)) {
      query.resources = {
        $elemMatch: {
          type: { $in: selectedTypes },
          "sportPrices.sport": selectedSport,
        },
      };
    } else if (selectedSport) {
      query["resources.sportPrices.sport"] = selectedSport;
    } else if (["outdoor", "indoor"].includes(resourceType)) {
      query["resources.type"] = { $in: selectedTypes };
    }

    try {
      const facilities = await FacilityModel.find(query).sort({ name: 1 });

      if (!onlyAvailableToday) {
        res.json(facilities);
        return;
      }

      const availableFacilities = [];

      for (const facility of facilities) {
        const isAvailable = await this.hasAvailableSlotToday(
          facility,
          selectedSport,
          resourceType,
        );

        if (isAvailable) {
          availableFacilities.push(facility);
        }
      }

      res.json(availableFacilities);
    } catch (error) {
      console.error("Facility search failed:", error);
      res.status(500).json({ message: "Facility search failed" });
    }
  };

  getPublicDetails = async (req: express.Request, res: express.Response) => {
    let id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Facility ID is not valid" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({ _id: id, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Active facility was not found" });
        return;
      }

      const likes = await FacilityReviewModel.countDocuments({ facilityId: id, reaction: "like" });
      const dislikes = await FacilityReviewModel.countDocuments({
        facilityId: id,
        reaction: "dislike",
      });

      res.json({ facility, likes, dislikes });
    } catch (error) {
      console.error("Failed to load facility details:", error);
      res.status(500).json({ message: "Failed to load facility details" });
    }
  };

  getCurrentPromotions = async (_req: express.Request, res: express.Response) => {
    const now = new Date();

    try {
      const facilities = await FacilityModel.find({
        status: "active",
        promotions: {
          $elemMatch: {
            startDate: { $lte: now },
            endDate: { $gte: now },
          },
        },
      });
      const promotions: any[] = [];

      facilities.forEach((facility) => {
        facility.promotions.forEach((promotion) => {
          if (promotion.startDate <= now && promotion.endDate >= now) {
            promotions.push({
              _id: promotion._id,
              facilityId: facility._id,
              facilityName: facility.name,
              name: promotion.name,
              sport: promotion.sport,
              startDate: promotion.startDate,
              endDate: promotion.endDate,
              discountType: promotion.discountType,
              discountValue: promotion.discountValue,
            });
          }
        });
      });

      promotions.sort(
        (first, second) =>
          new Date(first.endDate).getTime() - new Date(second.endDate).getTime(),
      );
      res.json(promotions.slice(0, 3));
    } catch (error) {
      console.error("Failed to load promotions:", error);
      res.status(500).json({ message: "Failed to load promotions" });
    }
  };

  private hasAvailableSlotToday = async (
    facility: any,
    selectedSport: string,
    resourceType: string,
  ) => {
    const now = new Date();
    const javascriptDay = now.getDay();
    const day = javascriptDay === 0 ? 7 : javascriptDay;
    const workingHours = facility.workingHours.find((item: any) => item.day === day);

    if (!workingHours) {
      return false;
    }

    const matchingResources = facility.resources.filter((resource: any) => {
      const typeMatches =
        !resourceType ||
        resource.type === resourceType ||
        (resourceType === "indoor" && resource.type === "hall");
      const sportMatches =
        !selectedSport || resource.sportPrices.some((item: any) => item.sport === selectedSport);
      return typeMatches && sportMatches;
    });

    if (matchingResources.length === 0) {
      return false;
    }

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const resourceIds = matchingResources.map((resource: any) => resource._id);
    const reservations = await ReservationModel.find({
      resourceId: { $in: resourceIds },
      status: "scheduled",
      startDateTime: { $lt: endOfDay },
      endDateTime: { $gt: startOfDay },
    });

    const workingStart = this.timeToMinutes(workingHours.from);
    const workingEnd = this.timeToMinutes(workingHours.to);
    let firstSlot = now.getHours() * 60;

    if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
      firstSlot += 60;
    }

    firstSlot = Math.max(firstSlot, workingStart);

    for (const resource of matchingResources) {
      for (let minute = firstSlot; minute + 60 <= workingEnd; minute += 60) {
        const slotStart = new Date(startOfDay);
        slotStart.setMinutes(minute);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        const occupied = reservations.some(
          (reservation) =>
            reservation.resourceId.toString() === resource._id.toString() &&
            reservation.startDateTime < slotEnd &&
            reservation.endDateTime > slotStart,
        );

        if (!occupied) {
          return true;
        }
      }
    }

    return false;
  };

  private timeToMinutes = (time: string) => {
    const parts = time.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };
}
