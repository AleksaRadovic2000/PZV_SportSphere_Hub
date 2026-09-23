import fs from "fs";
import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import ProductModel from "../../models/product";
import SportModel from "../../models/sport";

export class ProductController {
  searchProducts = async (req: express.Request, res: express.Response) => {
    let facilityId = req.body.facilityId;
    let sportValue = req.body.sport;
    let sport = "";

    if (typeof sportValue === "string") {
      sport = sportValue.trim();
    }

    if (!mongoose.isValidObjectId(facilityId)) {
      res.status(400).json({ message: "ID objekta nije ispravan" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Aktivan objekat nije pronadjen" });
        return;
      }

      const query: any = { facilityId, active: true };

      if (sport) {
        query.sport = sport;
      }

      const products = await ProductModel.find(query).sort({ name: 1 });
      res.json(products);
    } catch (error) {
      console.error("Pretraga proizvoda nije uspela:", error);
      res.status(500).json({ message: "Pretraga proizvoda nije uspela" });
    }
  };

  getFacilityProducts = async (req: express.Request, res: express.Response) => {
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

      const products = await ProductModel.find({ facilityId }).sort({ name: 1 });
      res.json(products);
    } catch (error) {
      console.error("Ucitavanje proizvoda objekta nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje proizvoda objekta nije uspelo" });
    }
  };

  addProduct = async (req: express.Request, res: express.Response) => {
    let productData = req.body.product;
    let employeeUsername = req.body.employeeUsername;

    if (!productData || !employeeUsername || !req.file) {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o proizvodu, zaposleni i slika su obavezni" });
      return;
    }

    let data;

    try {
      data = JSON.parse(productData);
    } catch {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o proizvodu nisu ispravan JSON" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    if (
      !mongoose.isValidObjectId(data.facilityId) ||
      !data.sport ||
      !data.name ||
      typeof data.price !== "number" ||
      data.price <= 0 ||
      !Number.isInteger(data.stock) ||
      data.stock < 0
    ) {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o proizvodu nisu ispravni" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({
        _id: data.facilityId,
        status: "active",
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        this.removeUploadedFile(req.file);
        res.status(403).json({ message: "Zaposleni ne upravlja ovim aktivnim objektom" });
        return;
      }

      const sport = await SportModel.findOne({ name: data.sport.trim() });

      if (!sport) {
        this.removeUploadedFile(req.file);
        res.status(400).json({ message: "Izabrani sport ne postoji" });
        return;
      }

      const product = await ProductModel.create({
        facilityId: data.facilityId,
        sport: data.sport.trim(),
        name: data.name.trim(),
        image: `uploads/products/${req.file.filename}`,
        price: data.price,
        stock: data.stock,
        active: true,
      });

      res.status(201).json({ message: "Proizvod je uspesno dodat", product });
    } catch (error) {
      this.removeUploadedFile(req.file);
      console.error("Dodavanje proizvoda nije uspelo:", error);
      res.status(500).json({ message: "Dodavanje proizvoda nije uspelo" });
    }
  };

  updateProduct = async (req: express.Request, res: express.Response) => {
    let productData = req.body.product;
    let employeeUsername = req.body.employeeUsername;

    if (!productData || !employeeUsername) {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o proizvodu i zaposleni su obavezni" });
      return;
    }

    let data;

    try {
      data = JSON.parse(productData);
    } catch {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci o proizvodu nisu ispravan JSON" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    if (
      !mongoose.isValidObjectId(data._id) ||
      typeof data.price !== "number" ||
      data.price <= 0 ||
      !Number.isInteger(data.stock) ||
      data.stock < 0 ||
      typeof data.active !== "boolean"
    ) {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Podaci za izmenu proizvoda nisu ispravni" });
      return;
    }

    try {
      const product = await ProductModel.findById(data._id);

      if (!product) {
        this.removeUploadedFile(req.file);
        res.status(404).json({ message: "Proizvod nije pronadjen" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: product.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        this.removeUploadedFile(req.file);
        res.status(403).json({ message: "Zaposleni ne upravlja objektom ovog proizvoda" });
        return;
      }

      product.price = data.price;
      product.stock = data.stock;
      product.active = data.active;

      if (req.file) {
        product.image = `uploads/products/${req.file.filename}`;
      }

      await product.save();
      res.json({ message: "Proizvod je uspesno izmenjen", product });
    } catch (error) {
      this.removeUploadedFile(req.file);
      console.error("Izmena proizvoda nije uspela:", error);
      res.status(500).json({ message: "Izmena proizvoda nije uspela" });
    }
  };

  private removeUploadedFile = (file: Express.Multer.File | undefined) => {
    if (file) {
      fs.unlink(file.path, () => undefined);
    }
  };
}
