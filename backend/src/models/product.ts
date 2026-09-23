import mongoose from "mongoose";

const Schema = mongoose.Schema;

const Product = new Schema({
  facilityId: { type: Schema.Types.ObjectId, required: true },
  sport: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: "" },
  price: { type: Number, required: true, min: 1 },
  stock: { type: Number, required: true, min: 0 },
  active: { type: Boolean, required: true, default: true },
}, { versionKey: false });

export default mongoose.model("ProductModel", Product, "products");
