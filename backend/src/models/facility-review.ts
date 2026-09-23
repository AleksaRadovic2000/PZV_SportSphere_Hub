import mongoose from "mongoose";

const Schema = mongoose.Schema;

const FacilityReview = new Schema(
  {
    reservationId: { type: Schema.Types.ObjectId, required: true, unique: true },
    athleteUsername: { type: String, required: true },
    facilityId: { type: Schema.Types.ObjectId, required: true },
    reaction: { type: String, required: true, enum: ["like", "dislike"] },
    comment: { type: String, default: "" },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);

export default mongoose.model("FacilityReviewModel", FacilityReview, "facilityReviews");
