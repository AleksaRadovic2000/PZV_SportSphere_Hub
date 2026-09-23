import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import SportModel from "../../models/sport";
import {
  getPromotionEndDate,
  getPromotionStartDate,
  validatePromotion,
} from "../../utils/validations/promotion-validation";

export class PromotionController {
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
      console.error("Ucitavanje promocija nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje promocija nije uspelo" });
    }
  };

  addPromotion = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let employeeUsername = req.body.employeeUsername;
    let promotion = req.body.promotion;

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername) {
      res.status(400).json({ message: "ID objekta i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    const validationMessage = validatePromotion(promotion);

    if (validationMessage) {
      res.status(400).json({ message: validationMessage });
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

      const sport = await SportModel.findOne({ name: promotion.sport.trim() });

      if (!sport) {
        res.status(400).json({ message: "Izabrani sport ne postoji" });
        return;
      }

      facility.promotions.push({
        name: promotion.name.trim(),
        sport: promotion.sport.trim(),
        startDate: getPromotionStartDate(promotion.startDate),
        endDate: getPromotionEndDate(promotion.endDate),
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
      });
      await facility.save();
      res.status(201).json({ message: "Promocija je uspesno dodata", facility });
    } catch (error) {
      console.error("Kreiranje promocije nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje promocije nije uspelo" });
    }
  };

  updatePromotion = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let employeeUsername = req.body.employeeUsername;
    let promotion = req.body.promotion;

    if (
      !mongoose.isValidObjectId(facilityId) ||
      !mongoose.isValidObjectId(promotion?._id) ||
      !employeeUsername
    ) {
      res.status(400).json({ message: "Podaci za izmenu promocije nisu ispravni" });
      return;
    }

    const validationMessage = validatePromotion(promotion);

    if (validationMessage) {
      res.status(400).json({ message: validationMessage });
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

      const existingPromotion = facility.promotions.id(promotion._id);

      if (!existingPromotion) {
        res.status(404).json({ message: "Promocija nije pronadjena" });
        return;
      }

      const sport = await SportModel.findOne({ name: promotion.sport.trim() });

      if (!sport) {
        res.status(400).json({ message: "Izabrani sport ne postoji" });
        return;
      }

      existingPromotion.name = promotion.name.trim();
      existingPromotion.sport = promotion.sport.trim();
      existingPromotion.startDate = getPromotionStartDate(promotion.startDate);
      existingPromotion.endDate = getPromotionEndDate(promotion.endDate);
      existingPromotion.discountType = promotion.discountType;
      existingPromotion.discountValue = promotion.discountValue;
      await facility.save();
      res.json({ message: "Promocija je uspesno izmenjena", facility });
    } catch (error) {
      console.error("Izmena promocije nije uspela:", error);
      res.status(500).json({ message: "Izmena promocije nije uspela" });
    }
  };
}
