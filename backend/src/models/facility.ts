import mongoose from "mongoose";

const Schema = mongoose.Schema;

const SportPrice = new Schema({
  sport: { type: String, required: true },
  pricePerHour: { type: Number, required: true, min: 1 },
});

const Resource = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ["outdoor", "indoor", "hall"] },
  capacity: { type: Number, required: true, min: 1 },
  equipmentDescription: { type: String, default: "", maxlength: 300 },
  sportPrices: { type: [SportPrice], default: [] },
});

const WorkingHours = new Schema(
  {
    day: { type: Number, required: true, min: 1, max: 7 },
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false },
);

const Location = new Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const Promotion = new Schema({
  name: { type: String, required: true },
  sport: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  discountType: { type: String, required: true, enum: ["percentage", "fixed"] },
  discountValue: { type: Number, required: true, min: 1 },
});

const Facility = new Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  description: { type: String, required: true },
  employeeUsernames: { type: [String], required: true },
  companyRegistrationNumber: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "active", "rejected"],
    default: "pending",
  },
  allowedNoShows: { type: Number, required: true, min: 1 },
  images: { type: [String], default: [] },
  location: { type: Location, required: true },
  workingHours: { type: [WorkingHours], default: [] },
  resources: { type: [Resource], default: [] },
  promotions: { type: [Promotion], default: [] },
}, { versionKey: false });

Facility.index({ name: 1, city: 1, address: 1 }, { unique: true });

export default mongoose.model("FacilityModel", Facility, "facilities");
