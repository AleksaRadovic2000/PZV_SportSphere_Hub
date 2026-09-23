import mongoose from "mongoose";

const Schema = mongoose.Schema;

const JoinRequest = new Schema({
  athleteUsername: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

const TeammateAd = new Schema({
  authorUsername: { type: String, required: true },
  sport: { type: String, required: true },
  city: { type: String, required: true },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },
  playersNeeded: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    required: true,
    enum: ["active", "completed", "closed"],
    default: "active",
  },
  requests: { type: [JoinRequest], default: [] },
}, { versionKey: false });

export default mongoose.model("TeammateAdModel", TeammateAd, "teammateAds");
