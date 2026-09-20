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
    let sport = typeof req.body.sport === "string" ? req.body.sport.trim() : "";

    if (!mongoose.isValidObjectId(facilityId)) {
      res.status(400).json({ message: "Facility ID is not valid" });
      return;
    }

    try {
      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Active facility was not found" });
        return;
      }

      const query: any = { facilityId, active: true };

      if (sport) {
        query.sport = sport;
      }

      const products = await ProductModel.find(query).sort({ name: 1 });
      res.json(products);
    } catch (error) {
      console.error("Product search failed:", error);
      res.status(500).json({ message: "Product search failed" });
    }
  };

  getFacilityProducts = async (req: express.Request, res: express.Response) => {
    let facilityId = req.params.id;
    let employeeUsername = String(req.query.employeeUsername || "");

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername) {
      res.status(400).json({ message: "Facility ID and employee username are required" });
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

      const products = await ProductModel.find({ facilityId }).sort({ name: 1 });
      res.json(products);
    } catch (error) {
      console.error("Failed to load facility products:", error);
      res.status(500).json({ message: "Failed to load facility products" });
    }
  };

  addProduct = async (req: express.Request, res: express.Response) => {
    let productData = req.body.product;
    let employeeUsername = req.body.employeeUsername;

    if (!productData || !employeeUsername || !req.file) {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Product data, employee and image are required" });
      return;
    }

    let data;

    try {
      data = JSON.parse(productData);
    } catch {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Product data is not valid JSON" });
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
      res.status(400).json({ message: "Product data is not valid" });
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
        res.status(403).json({ message: "Employee does not manage this active facility" });
        return;
      }

      const sport = await SportModel.findOne({ name: data.sport.trim() });

      if (!sport) {
        this.removeUploadedFile(req.file);
        res.status(400).json({ message: "Selected sport does not exist" });
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

      res.status(201).json({ message: "Product added successfully", product });
    } catch (error) {
      this.removeUploadedFile(req.file);
      console.error("Product creation failed:", error);
      res.status(500).json({ message: "Product creation failed" });
    }
  };

  updateProduct = async (req: express.Request, res: express.Response) => {
    let productData = req.body.product;
    let employeeUsername = req.body.employeeUsername;

    if (!productData || !employeeUsername) {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Product data and employee are required" });
      return;
    }

    let data;

    try {
      data = JSON.parse(productData);
    } catch {
      this.removeUploadedFile(req.file);
      res.status(400).json({ message: "Product data is not valid JSON" });
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
      res.status(400).json({ message: "Product update data is not valid" });
      return;
    }

    try {
      const product = await ProductModel.findById(data._id);

      if (!product) {
        this.removeUploadedFile(req.file);
        res.status(404).json({ message: "Product was not found" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: product.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        this.removeUploadedFile(req.file);
        res.status(403).json({ message: "Employee does not manage this product facility" });
        return;
      }

      product.price = data.price;
      product.stock = data.stock;
      product.active = data.active;

      if (req.file) {
        product.image = `uploads/products/${req.file.filename}`;
      }

      await product.save();
      res.json({ message: "Product updated successfully", product });
    } catch (error) {
      this.removeUploadedFile(req.file);
      console.error("Product update failed:", error);
      res.status(500).json({ message: "Product update failed" });
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
      res.status(400).json({ message: "Order data is not valid" });
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
        res.status(404).json({ message: "Active athlete was not found" });
        return;
      }

      const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

      if (!facility) {
        res.status(404).json({ message: "Active facility was not found" });
        return;
      }

      const orderItems = [];
      const productIds = new Set<string>();
      let totalPrice = 0;

      for (const item of items) {
        if (!mongoose.isValidObjectId(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) {
          res.status(400).json({ message: "Order item is not valid" });
          return;
        }

        if (productIds.has(item.productId)) {
          res.status(400).json({ message: "The same product cannot appear twice in one order" });
          return;
        }

        productIds.add(item.productId);

        const product = await ProductModel.findOne({
          _id: item.productId,
          facilityId,
          active: true,
        });

        if (!product || product.stock < item.quantity) {
          res.status(400).json({ message: "Product is unavailable in requested quantity" });
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

      res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
      console.error("Order creation failed:", error);
      res.status(500).json({ message: "Order creation failed" });
    }
  };

  getAthleteOrders = async (req: express.Request, res: express.Response) => {
    let username = req.params.username;

    try {
      const orders = await OrderModel.find({ athleteUsername: username }).sort({ createdAt: -1 });
      const result = await this.addFacilityNames(orders);
      res.json(result);
    } catch (error) {
      console.error("Failed to load athlete orders:", error);
      res.status(500).json({ message: "Failed to load athlete orders" });
    }
  };

  getFacilityOrders = async (req: express.Request, res: express.Response) => {
    let facilityId = req.params.id;
    let employeeUsername = String(req.query.employeeUsername || "");

    if (!mongoose.isValidObjectId(facilityId) || !employeeUsername) {
      res.status(400).json({ message: "Facility ID and employee username are required" });
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

      const orders = await OrderModel.find({ facilityId }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      console.error("Failed to load facility orders:", error);
      res.status(500).json({ message: "Failed to load facility orders" });
    }
  };

  cancelOrder = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let athleteUsername = req.body.athleteUsername;

    if (!mongoose.isValidObjectId(id) || !athleteUsername) {
      res.status(400).json({ message: "Order ID and athlete username are required" });
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
        res.status(404).json({ message: "Active order was not found" });
        return;
      }

      await this.restoreStock(order.items);
      order.status = "cancelled";
      await order.save();
      res.json({ message: "Order cancelled successfully", order });
    } catch (error) {
      console.error("Order cancellation failed:", error);
      res.status(500).json({ message: "Order cancellation failed" });
    }
  };

  updateOrderStatus = async (req: express.Request, res: express.Response) => {
    let id = req.body.id;
    let employeeUsername = req.body.employeeUsername;
    let status = req.body.status;

    if (!mongoose.isValidObjectId(id) || !employeeUsername || !status) {
      res.status(400).json({ message: "Order status data is not valid" });
      return;
    }

    employeeUsername = employeeUsername.trim();

    try {
      const order = await OrderModel.findById(id);

      if (!order) {
        res.status(404).json({ message: "Order was not found" });
        return;
      }

      const facility = await FacilityModel.findOne({
        _id: order.facilityId,
        employeeUsernames: employeeUsername,
      });

      if (!facility) {
        res.status(403).json({ message: "Employee does not manage this order facility" });
        return;
      }

      const validTransition =
        (order.status === "ordered" && ["accepted", "cancelled"].includes(status)) ||
        (order.status === "accepted" && ["collected", "cancelled"].includes(status));

      if (!validTransition) {
        res.status(400).json({ message: "Order status transition is not allowed" });
        return;
      }

      if (status === "cancelled") {
        await this.restoreStock(order.items);
      }

      order.status = status;
      await order.save();
      res.json({ message: "Order status updated successfully", order });
    } catch (error) {
      console.error("Order status update failed:", error);
      res.status(500).json({ message: "Order status update failed" });
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
