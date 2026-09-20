import mongoose from "mongoose";

const Schema = mongoose.Schema;

const Training = new Schema({
  athleteUsername: { type: String, required: true },
  trainerId: { type: Schema.Types.ObjectId, required: true },
  facilityId: { type: Schema.Types.ObjectId, required: true },
  resourceId: { type: Schema.Types.ObjectId, required: true },
  sport: { type: String, required: true },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },
  price: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ["scheduled", "cancelled", "attended", "no_show"],
    default: "scheduled",
  },
});

export default mongoose.model("TrainingModel", Training, "trainings");
