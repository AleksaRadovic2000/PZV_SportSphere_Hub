import mongoose from "mongoose";

const Schema = mongoose.Schema;

let Sport = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

export default mongoose.model("SportModel", Sport, "sports");
