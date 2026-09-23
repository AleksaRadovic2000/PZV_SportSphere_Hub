import fs from "fs";
import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import SportModel from "../models/sport";
import UserModel from "../models/user";
import { validateFacility } from "../utils/facility-validation";

const removeUploadedFiles = (files: Express.Multer.File[]) => {
  files.forEach((file) => fs.unlink(file.path, () => undefined));
};

const getUploadedFiles = (req: express.Request) => {
  return Array.isArray(req.files) ? req.files : [];
};

export class FacilityController {
  getEmployeeFacilities = (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    FacilityModel.find({ employeeUsernames: username })
      .sort({ name: 1 })
      .then((facilities) => {
        res.json(facilities);
      })
      .catch((error) => {
        console.error("Ucitavanje objekata nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje objekata nije uspelo" });
      });
  };

  getManagedDetails = async (req: express.Request, res: express.Response) => {
    let id = req.params.id;
    let username = req.params.username;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "ID objekta nije ispravan" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({ _id: id, employeeUsernames: username });

      if (!facility) {
        res.status(404).json({ message: "Objekat nije pronadjen" });
        return;
      }

      res.json(facility);
    } catch (error) {
      console.error("Ucitavanje objekta nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje objekta nije uspelo" });
    }
  };

  create = async (req: express.Request, res: express.Response) => {
    const files = getUploadedFiles(req);
    let facilityData = req.body.facility;
    let username = req.body.username;
    let data;

    if (!facilityData || !username) {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Podaci o objektu i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    try {
      data = JSON.parse(facilityData);
    } catch {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Podaci o objektu nisu ispravan JSON" });
      return;
    }

    username = username.trim();

    try {
      const employee = await UserModel.findOne({
        username,
        role: "employee",
        status: "active",
      });

      if (!employee) {
        removeUploadedFiles(files);
        res.status(404).json({ message: "Aktivan zaposleni nije pronadjen" });
        return;
      }

      const companyEmployees = await UserModel.find({
        role: "employee",
        status: "active",
        registrationNumber: employee.registrationNumber,
      });

      data.employeeUsernames = companyEmployees.map((item) => item.username);
      data.companyRegistrationNumber = employee.registrationNumber;
      data.status = "pending";
      data.images = files.map((file) => `uploads/facilities/${file.filename}`);

      const validationMessage = validateFacility(data);

      if (validationMessage) {
        removeUploadedFiles(files);
        res.status(400).json({ message: validationMessage });
        return;
      }

      const sportsAreValid = await this.sportsAreValid(data);

      if (!sportsAreValid) {
        removeUploadedFiles(files);
        res.status(400).json({ message: "Jedan ili vise izabranih sportova ne postoje" });
        return;
      }

      const existingFacility = await FacilityModel.findOne({
        name: data.name.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
      });

      if (existingFacility) {
        removeUploadedFiles(files);
        res.status(409).json({ message: "Objekat sa ovim nazivom i adresom vec postoji" });
        return;
      }

      const facility = await FacilityModel.create(this.prepareFacilityData(data));

      res.status(201).json({
        message: "Objekat je kreiran i ceka odobrenje administratora",
        facility,
      });
    } catch (error) {
      removeUploadedFiles(files);
      console.error("Kreiranje objekta nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje objekta nije uspelo" });
    }
  };

  update = async (req: express.Request, res: express.Response) => {
    const files = getUploadedFiles(req);
    let facilityData = req.body.facility;
    let username = req.body.username;
    let data;

    if (!facilityData || !username) {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Podaci o objektu i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    try {
      data = JSON.parse(facilityData);
    } catch {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Podaci o objektu nisu ispravan JSON" });
      return;
    }

    if (!mongoose.isValidObjectId(data._id)) {
      removeUploadedFiles(files);
      res.status(400).json({ message: "ID objekta nije ispravan" });
      return;
    }

    username = username.trim();

    try {
      const existingFacility = await FacilityModel.findOne({
        _id: data._id,
        employeeUsernames: username,
      });

      if (!existingFacility) {
        removeUploadedFiles(files);
        res.status(404).json({ message: "Objekat nije pronadjen" });
        return;
      }

      data.employeeUsernames = existingFacility.employeeUsernames;
      data.companyRegistrationNumber = existingFacility.companyRegistrationNumber;
      data.status = existingFacility.status;
      data.images = [
        ...(Array.isArray(data.images) ? data.images : []),
        ...files.map((file) => `uploads/facilities/${file.filename}`),
      ];

      const validationMessage = validateFacility(data);

      if (validationMessage) {
        removeUploadedFiles(files);
        res.status(400).json({ message: validationMessage });
        return;
      }

      const sportsAreValid = await this.sportsAreValid(data);

      if (!sportsAreValid) {
        removeUploadedFiles(files);
        res.status(400).json({ message: "Jedan ili vise izabranih sportova ne postoje" });
        return;
      }

      const duplicateFacility = await FacilityModel.findOne({
        _id: { $ne: data._id },
        name: data.name.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
      });

      if (duplicateFacility) {
        removeUploadedFiles(files);
        res.status(409).json({ message: "Objekat sa ovim nazivom i adresom vec postoji" });
        return;
      }

      const facility = await FacilityModel.findByIdAndUpdate(
        data._id,
        this.prepareFacilityData(data),
        { new: true, runValidators: true },
      );

      res.json({ message: "Objekat je uspesno izmenjen", facility });
    } catch (error) {
      removeUploadedFiles(files);
      console.error("Izmena objekta nije uspela:", error);
      res.status(500).json({ message: "Izmena objekta nije uspela" });
    }
  };

  importFacility = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!req.file || !username) {
      res.status(400).json({ message: "JSON fajl i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    let data;

    try {
      data = JSON.parse(req.file.buffer.toString("utf-8"));
    } catch {
      res.status(400).json({ message: "Izabrani fajl ne sadrzi ispravan JSON" });
      return;
    }

    username = username.trim();

    try {
      const employee = await UserModel.findOne({
        username,
        role: "employee",
        status: "active",
      });

      if (!employee) {
        res.status(404).json({ message: "Aktivan zaposleni nije pronadjen" });
        return;
      }

      delete data._id;
      const companyEmployees = await UserModel.find({
        role: "employee",
        status: "active",
        registrationNumber: employee.registrationNumber,
      });

      data.employeeUsernames = companyEmployees.map((item) => item.username);
      data.companyRegistrationNumber = employee.registrationNumber;
      data.status = "pending";
      data.images = [];

      const validationMessage = validateFacility(data);

      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }

      const sportsAreValid = await this.sportsAreValid(data);

      if (!sportsAreValid) {
        res.status(400).json({ message: "Jedan ili vise izabranih sportova ne postoje" });
        return;
      }

      const existingFacility = await FacilityModel.findOne({
        name: data.name.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
      });

      if (existingFacility) {
        res.status(409).json({ message: "Objekat sa ovim nazivom i adresom vec postoji" });
        return;
      }

      const facility = await FacilityModel.create(this.prepareFacilityData(data));
      res.status(201).json({
        message: "Objekat je uvezen i ceka odobrenje administratora",
        facility,
      });
    } catch (error) {
      console.error("Uvoz objekta nije uspeo:", error);
      res.status(500).json({ message: "Uvoz objekta nije uspeo" });
    }
  };

  getPending = (_req: express.Request, res: express.Response) => {
    FacilityModel.find({ status: "pending" })
      .sort({ name: 1 })
      .then((facilities) => res.json(facilities))
      .catch((error) => {
        console.error("Ucitavanje objekata na cekanju nije uspelo:", error);
        res.status(500).json({ message: "Ucitavanje objekata na cekanju nije uspelo" });
      });
  };

  approve = (req: express.Request, res: express.Response) => {
    this.changeStatus(req, res, "active");
  };

  reject = (req: express.Request, res: express.Response) => {
    this.changeStatus(req, res, "rejected");
  };

  addPromotion = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let employeeUsername = req.body.employeeUsername;
    let promotion = req.body.promotion;

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername) {
      res.status(400).json({ message: "ID objekta i korisnicko ime zaposlenog su obavezni" });
      return;
    }

    const validationMessage = this.validatePromotion(promotion);

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
        startDate: this.getPromotionStartDate(promotion.startDate),
        endDate: this.getPromotionEndDate(promotion.endDate),
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

    const validationMessage = this.validatePromotion(promotion);

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
      existingPromotion.startDate = this.getPromotionStartDate(promotion.startDate);
      existingPromotion.endDate = this.getPromotionEndDate(promotion.endDate);
      existingPromotion.discountType = promotion.discountType;
      existingPromotion.discountValue = promotion.discountValue;
      await facility.save();
      res.json({ message: "Promocija je uspesno izmenjena", facility });
    } catch (error) {
      console.error("Izmena promocije nije uspela:", error);
      res.status(500).json({ message: "Izmena promocije nije uspela" });
    }
  };

  private changeStatus = async (
    req: express.Request,
    res: express.Response,
    status: "active" | "rejected",
  ) => {
    let id = req.body.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "ID objekta nije ispravan" });
      return;
    }

    try {
      const facility = await FacilityModel.findOneAndUpdate(
        { _id: id, status: "pending" },
        { status },
        { new: true },
      );

      if (!facility) {
        res.status(404).json({ message: "Zahtev za objekat na cekanju nije pronadjen" });
        return;
      }

      res.json({ message: status === "active" ? "Objekat je odobren" : "Objekat je odbijen" });
    } catch (error) {
      console.error("Izmena statusa objekta nije uspela:", error);
      res.status(500).json({ message: "Izmena statusa objekta nije uspela" });
    }
  };

  private sportsAreValid = async (facility: any) => {
    const sports = new Set<string>();

    facility.resources.forEach((resource: any) => {
      resource.sportPrices.forEach((price: any) => sports.add(price.sport.trim()));
    });

    facility.promotions.forEach((promotion: any) => sports.add(promotion.sport.trim()));

    const numberOfSports = await SportModel.countDocuments({ name: { $in: [...sports] } });
    return numberOfSports === sports.size;
  };

  private validatePromotion = (promotion: any) => {
    if (!promotion || !promotion.name || !promotion.sport) {
      return "Naziv promocije i sport su obavezni";
    }

    const startDate = this.getPromotionStartDate(promotion.startDate);
    const endDate = this.getPromotionEndDate(promotion.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return "Period promocije nije ispravan";
    }

    if (!["percentage", "fixed"].includes(promotion.discountType)) {
      return "Tip popusta promocije nije ispravan";
    }

    if (typeof promotion.discountValue !== "number" || promotion.discountValue <= 0) {
      return "Vrednost popusta promocije mora biti pozitivna";
    }

    if (promotion.discountType === "percentage" && promotion.discountValue > 100) {
      return "Procentualni popust ne moze biti veci od 100";
    }

    return "";
  };

  private prepareFacilityData = (data: any) => {
    const promotions = data.promotions.map((promotion: any) => ({
      ...promotion,
      startDate: this.getPromotionStartDate(promotion.startDate),
      endDate: this.getPromotionEndDate(promotion.endDate),
    }));

    return {
      name: data.name.trim(),
      city: data.city.trim(),
      address: data.address.trim(),
      description: data.description.trim(),
      employeeUsernames: data.employeeUsernames,
      companyRegistrationNumber: data.companyRegistrationNumber,
      status: data.status,
      allowedNoShows: data.allowedNoShows,
      images: data.images,
      location: data.location,
      workingHours: data.workingHours,
      resources: data.resources,
      promotions,
    };
  };

  private getPromotionEndDate = (value: string | Date) => {
    const endDate = new Date(value);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  };

  private getPromotionStartDate = (value: string | Date) => {
    const startDate = new Date(value);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  };
}
