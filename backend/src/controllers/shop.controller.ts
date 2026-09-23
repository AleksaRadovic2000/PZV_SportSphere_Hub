import fs from "fs";
import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../models/facility";
import OrderModel from "../models/order";
import ProductModel from "../models/product";
import SportModel from "../models/sport";
import UserModel from "../models/user";

export class ShopController {
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

  createOrder = async (req: express.Request, res: express.Response) => {
    let athleteUsername = req.body.athleteUsername;
    let facilityId = req.body.facilityId;
    let items = req.body.items;

    if (
      !athleteUsername ||
      !mongoose.isValidObjectId(facilityId) ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({ message: "Podaci o porudzbini nisu ispravni" });
      return;
    }

    athleteUsername = athleteUsername.trim();

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

      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Aktivan objekat nije pronadjen" });
        return;
      }

      const orderItems = [];
      const productIds = new Set<string>();
      let totalPrice = 0;

      for (const item of items) {
        if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) {
          res.status(400).json({ message: "Stavka porudzbine nije ispravna" });
          return;
        }

        if (productIds.has(item.productId)) {
          res.status(400).json({ message: "Isti proizvod se ne moze pojaviti dva puta u jednoj porudzbini" });
          return;
        }

        productIds.add(item.productId);

        const product = await ProductModel.findOne({
          _id: item.productId,
          facilityId,
          active: true,
        });

        if (!product || product.stock < item.quantity) {
          res.status(400).json({ message: "Proizvod nije dostupan u trazenoj kolicini" });
          return;
        }

        orderItems.push({
          productId: product._id,
          productName: product.name,
          unitPrice: product.price,
          quantity: item.quantity,
        });
        totalPrice += product.price * item.quantity;
      }

      for (const item of orderItems) {
        await ProductModel.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }

      const order = await OrderModel.create({
        athleteUsername,
        facilityId,
        items: orderItems,
        totalPrice,
        status: "ordered",
        createdAt: new Date(),
      });

      res.status(201).json({ message: "Porudzbina je uspesno kreirana", order });
    } catch (error) {
      console.error("Kreiranje porudzbine nije uspelo:", error);
      res.status(500).json({ message: "Kreiranje porudzbine nije uspelo" });
    }
  };

  getAthleteOrders = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    try {
      const orders = await OrderModel.find({ athleteUsername: username }).sort({ createdAt: -1 });
      const result = await this.addFacilityNames(orders);
      res.json(result);
    } catch (error) {
      console.error("Ucitavanje porudzbina sportiste nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje porudzbina sportiste nije uspelo" });
    }
  };

  getFacilityOrders = async (req: express.Request, res: express.Response) => {
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

      const orders = await OrderModel.find({ facilityId }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      console.error("Ucitavanje porudzbina objekta nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje porudzbina objekta nije uspelo" });
    }
  };

  cancelOrder = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "ID porudzbine i korisnicko ime sportiste su obavezni" });
      return;
    }

    athleteUsername = athleteUsername.trim();

    try {
      const order = await OrderModel.findOne({
        _id: id,
        athleteUsername,
        status: { $in: ["ordered", "accepted"] },
      });

      if (!order) {
        res.status(404).json({ message: "Aktivna porudzbina nije pronadjena" });
        return;
      }

      await this.restoreStock(order.items);
      order.status = "cancelled";
      await order.save();
      res.json({ message: "Porudzbina je uspesno otkazana", order });
    } catch (error) {
      console.error("Otkazivanje porudzbine nije uspelo:", error);
      res.status(500).json({ message: "Otkazivanje porudzbine nije uspelo" });
    }
  };

  updateOrderStatus = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let status = req.body.status;

    if (!mongoose.isValidObjectId(id) || !employeeUsername || !status) {
      res.status(400).json({ message: "Podaci o statusu porudzbine nisu ispravni" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const order = await OrderModel.findById(id);

      if (!order) {
        res.status(404).json({ message: "Porudzbina nije pronadjena" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: order.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Zaposleni ne upravlja objektom ove porudzbine" });
        return;
      }

      const validTransition =
        (order.status === "ordered" && ["accepted", "cancelled"].includes(status)) ||
        (order.status === "accepted" && ["collected", "cancelled"].includes(status));

      if (!validTransition) {
        res.status(400).json({ message: "Promena statusa porudzbine nije dozvoljena" });
        return;
      }

      if (status === "cancelled") {
        await this.restoreStock(order.items);
      }

      order.status = status;
      await order.save();
      res.json({ message: "Status porudzbine je uspesno izmenjen", order });
    } catch (error) {
      console.error("Izmena statusa porudzbine nije uspela:", error);
      res.status(500).json({ message: "Izmena statusa porudzbine nije uspela" });
    }
  };

  private restoreStock = async (items: any[]) => {
    for (const item of items) {
      await ProductModel.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }
  };

  private addFacilityNames = async (orders: any[]) => {
    const result = [];

    for (const order of orders) {
      const facility = await FacilityModel.findById(order.facilityId);
      result.push({
        ...order.toObject(),
        facilityName: facility?.name || "",
      });
    }

    return result;
  };

  private removeUploadedFile = (file: Express.Multer.File | undefined) => {
    if (file) {
      fs.unlink(file.path, () => undefined);
    }
  };
}
