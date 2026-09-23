import mongoose from "mongoose";

const Schema = mongoose.Schema;

const Trainer = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  facilityId: { type: Schema.Types.ObjectId, required: true },
  sports: { type: [String], required: true },
  specialization: { type: String, required: true },
  averageRating: { type: Number, required: true, min: 0, max: 5 },
  pricePerHour: { type: Number, required: true, min: 0 },
  active: { type: Boolean, required: true, default: true },
}, { versionKey: false });

export default mongoose.model("TrainerModel", Trainer, "trainers");
