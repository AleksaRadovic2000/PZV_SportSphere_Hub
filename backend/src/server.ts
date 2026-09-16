import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://127.0.0.1:27017/sportsphere")
  .then(() => {
    console.log("MongoDB connection successful");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

app.get("/", (_req, res) => {
  res.json({ message: "SportSphere Hub API works" });
});

app.listen(4000, () => console.log("Express running on port 4000"));
