import express from "express";
import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import OrderModel from "../../models/order";
import ProductModel from "../../models/product";
import UserModel from "../../models/user";

export class OrderController {
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
}
