import express from "express";
import { ShopController } from "../controllers/shop.controller";
import { productImageUpload } from "../middleware/product-upload";

const shopRouter = express.Router();

shopRouter.route("/products/search").post((req, res) => {
  new ShopController().searchProducts(req, res);
});

shopRouter.route("/products/facility/:id").get((req, res) => {
  new ShopController().getFacilityProducts(req, res);
});

shopRouter.route("/products/add").post(productImageUpload.single("image"), (req, res) => {
  new ShopController().addProduct(req, res);
});

shopRouter.route("/products/update").post(productImageUpload.single("image"), (req, res) => {
  new ShopController().updateProduct(req, res);
});

shopRouter.route("/orders/create").post((req, res) => {
  new ShopController().createOrder(req, res);
});

shopRouter.route("/orders/athlete/:username").get((req, res) => {
  new ShopController().getAthleteOrders(req, res);
});

shopRouter.route("/orders/facility/:id").get((req, res) => {
  new ShopController().getFacilityOrders(req, res);
});

shopRouter.route("/orders/cancel").post((req, res) => {
  new ShopController().cancelOrder(req, res);
});

shopRouter.route("/orders/status").post((req, res) => {
  new ShopController().updateOrderStatus(req, res);
});

export default shopRouter;
