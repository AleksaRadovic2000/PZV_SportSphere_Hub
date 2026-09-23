import express from "express";
import { OrderController } from "../controllers/shop/order.controller";
import { ProductController } from "../controllers/shop/product.controller";
import { productImageUpload } from "../middleware/product-upload";

const shopRouter = express.Router();

shopRouter.route("/products/search").post((req, res) => {
  new ProductController().searchProducts(req, res);
});

shopRouter.route("/products/facility/:id").get((req, res) => {
  new ProductController().getFacilityProducts(req, res);
});

shopRouter.route("/products/add").post(productImageUpload.single("image"), (req, res) => {
  new ProductController().addProduct(req, res);
});

shopRouter.route("/products/update").post(productImageUpload.single("image"), (req, res) => {
  new ProductController().updateProduct(req, res);
});

shopRouter.route("/orders/create").post((req, res) => {
  new OrderController().createOrder(req, res);
});

shopRouter.route("/orders/athlete/:username").get((req, res) => {
  new OrderController().getAthleteOrders(req, res);
});

shopRouter.route("/orders/facility/:id").get((req, res) => {
  new OrderController().getFacilityOrders(req, res);
});

shopRouter.route("/orders/cancel").post((req, res) => {
  new OrderController().cancelOrder(req, res);
});

shopRouter.route("/orders/status").post((req, res) => {
  new OrderController().updateOrderStatus(req, res);
});

export default shopRouter;
