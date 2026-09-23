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
        console.error("Failed to load employee facilities:", error);
        res.status(500).json({ message: "Failed to load facilities" });
      });
  };

  getManagedDetails = async (req: express.Request, res: express.Response) => {
    let id = req.params.id;
    let username = req.params.username;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Facility ID is not valid" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({ _id: id, employeeUsernames: username });

      if (!facility) {
        res.status(404).json({ message: "Facility was not found" });
        return;
      }

      res.json(facility);
    } catch (error) {
      console.error("Failed to load facility:", error);
      res.status(500).json({ message: "Failed to load facility" });
    }
  };

  create = async (req: express.Request, res: express.Response) => {
    const files = getUploadedFiles(req);
    let facilityData = req.body.facility;
    let username = req.body.username;
    let data;

    if (!facilityData || !username) {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Facility data and employee username are required" });
      return;
    }

    try {
      data = JSON.parse(facilityData);
    } catch {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Facility data is not valid JSON" });
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
        res.status(404).json({ message: "Active employee was not found" });
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
        res.status(400).json({ message: "One or more selected sports do not exist" });
        return;
      }

      const existingFacility = await FacilityModel.findOne({
        name: data.name.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
      });

      if (existingFacility) {
        removeUploadedFiles(files);
        res.status(409).json({ message: "A facility with this name and address already exists" });
        return;
      }

      const facility = await FacilityModel.create(this.prepareFacilityData(data));

      res.status(201).json({
        message: "Facility created and is waiting for administrator approval",
        facility,
      });
    } catch (error) {
      removeUploadedFiles(files);
      console.error("Facility creation failed:", error);
      res.status(500).json({ message: "Facility creation failed" });
    }
  };

  update = async (req: express.Request, res: express.Response) => {
    const files = getUploadedFiles(req);
    let facilityData = req.body.facility;
    let username = req.body.username;
    let data;

    if (!facilityData || !username) {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Facility data and employee username are required" });
      return;
    }

    try {
      data = JSON.parse(facilityData);
    } catch {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Facility data is not valid JSON" });
      return;
    }

    if (!mongoose.isValidObjectId(data._id)) {
      removeUploadedFiles(files);
      res.status(400).json({ message: "Facility ID is not valid" });
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
        res.status(404).json({ message: "Facility was not found" });
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
        res.status(400).json({ message: "One or more selected sports do not exist" });
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
        res.status(409).json({ message: "A facility with this name and address already exists" });
        return;
      }

      const facility = await FacilityModel.findByIdAndUpdate(
        data._id,
        this.prepareFacilityData(data),
        { new: true, runValidators: true },
      );

      res.json({ message: "Facility updated successfully", facility });
    } catch (error) {
      removeUploadedFiles(files);
      console.error("Facility update failed:", error);
      res.status(500).json({ message: "Facility update failed" });
    }
  };

  importFacility = async (req: express.Request, res: express.Response) => {
    let username = req.body.username;

    if (!req.file || !username) {
      res.status(400).json({ message: "JSON file and employee username are required" });
      return;
    }

    let data;

    try {
      data = JSON.parse(req.file.buffer.toString("utf-8"));
    } catch {
      res.status(400).json({ message: "Selected file does not contain valid JSON" });
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
        res.status(404).json({ message: "Active employee was not found" });
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
        res.status(400).json({ message: "One or more selected sports do not exist" });
        return;
      }

      const existingFacility = await FacilityModel.findOne({
        name: data.name.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
      });

      if (existingFacility) {
        res.status(409).json({ message: "A facility with this name and address already exists" });
        return;
      }

      const facility = await FacilityModel.create(this.prepareFacilityData(data));
      res.status(201).json({
        message: "Facility imported and is waiting for administrator approval",
        facility,
      });
    } catch (error) {
      console.error("Facility import failed:", error);
      res.status(500).json({ message: "Facility import failed" });
    }
  };

  getPending = (_req: express.Request, res: express.Response) => {
    FacilityModel.find({ status: "pending" })
      .sort({ name: 1 })
      .then((facilities) => res.json(facilities))
      .catch((error) => {
        console.error("Failed to load pending facilities:", error);
        res.status(500).json({ message: "Failed to load pending facilities" });
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
      res.status(400).json({ message: "Facility ID and employee username are required" });
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
        res.status(403).json({ message: "Employee does not manage this facility" });
        return;
      }

      const sport = await SportModel.findOne({ name: promotion.sport.trim() });

      if (!sport) {
        res.status(400).json({ message: "Selected sport does not exist" });
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
      res.status(201).json({ message: "Promotion added successfully", facility });
    } catch (error) {
      console.error("Promotion creation failed:", error);
      res.status(500).json({ message: "Promotion creation failed" });
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
      res.status(400).json({ message: "Promotion update data is not valid" });
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
        res.status(403).json({ message: "Employee does not manage this facility" });
        return;
      }

      const existingPromotion = facility.promotions.id(promotion._id);

      if (!existingPromotion) {
        res.status(404).json({ message: "Promotion was not found" });
        return;
      }

      const sport = await SportModel.findOne({ name: promotion.sport.trim() });

      if (!sport) {
        res.status(400).json({ message: "Selected sport does not exist" });
        return;
      }

      existingPromotion.name = promotion.name.trim();
      existingPromotion.sport = promotion.sport.trim();
      existingPromotion.startDate = this.getPromotionStartDate(promotion.startDate);
      existingPromotion.endDate = this.getPromotionEndDate(promotion.endDate);
      existingPromotion.discountType = promotion.discountType;
      existingPromotion.discountValue = promotion.discountValue;
      await facility.save();
      res.json({ message: "Promotion updated successfully", facility });
    } catch (error) {
      console.error("Promotion update failed:", error);
      res.status(500).json({ message: "Promotion update failed" });
    }
  };

  private changeStatus = async (
    req: express.Request,
    res: express.Response,
    status: "active" | "rejected",
  ) => {
    let id = req.body.id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: "Facility ID is not valid" });
      return;
    }

    try {
      const facility = await FacilityModel.findOneAndUpdate(
        { _id: id, status: "pending" },
        { status },
        { new: true },
      );

      if (!facility) {
        res.status(404).json({ message: "Pending facility request was not found" });
        return;
      }

      res.json({ message: status === "active" ? "Facility approved" : "Facility rejected" });
    } catch (error) {
      console.error("Facility status update failed:", error);
      res.status(500).json({ message: "Facility status update failed" });
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
      return "Promotion name and sport are required";
    }

    const startDate = this.getPromotionStartDate(promotion.startDate);
    const endDate = this.getPromotionEndDate(promotion.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return "Promotion period is not valid";
    }

    if (!["percentage", "fixed"].includes(promotion.discountType)) {
      return "Promotion discount type is not valid";
    }

    if (typeof promotion.discountValue !== "number" || promotion.discountValue <= 0) {
      return "Promotion discount value must be positive";
    }

    if (promotion.discountType === "percentage" && promotion.discountValue > 100) {
      return "Percentage discount cannot be greater than 100";
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
