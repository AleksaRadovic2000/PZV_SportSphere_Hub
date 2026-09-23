import mongoose from "mongoose";

const Schema = mongoose.Schema;

const OrderItem = new Schema({
  productId: { type: Schema.Types.ObjectId, required: true },
  productName: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
});

const Order = new Schema({
  athleteUsername: { type: String, required: true },
  facilityId: { type: Schema.Types.ObjectId, required: true },
  items: { type: [OrderItem], required: true },
  totalPrice: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ["ordered", "accepted", "collected", "cancelled"],
    default: "ordered",
  },
  createdAt: { type: Date, required: true, default: Date.now },
}, { versionKey: false });

export default mongoose.model("OrderModel", Order, "orders");
