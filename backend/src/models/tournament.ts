import mongoose from "mongoose";

const Schema = mongoose.Schema;

const TournamentApplication = new Schema({
  athleteUsername: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

const Tournament = new Schema({
  facilityId: { type: Schema.Types.ObjectId, required: true, ref: "FacilityModel" },
  createdByUsername: { type: String, required: true },
  name: { type: String, required: true },
  sport: { type: String, required: true },
  startDateTime: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ["open", "closed"],
    default: "open",
  },
  applications: { type: [TournamentApplication], default: [] },
});

export default mongoose.model("TournamentModel", Tournament, "tournaments");
