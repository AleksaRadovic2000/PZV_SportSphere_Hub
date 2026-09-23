import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import facilityRouter from "./routers/facility.router";
import reservationRouter from "./routers/reservation.router";
import reportRouter from "./routers/report.router";
import reviewRouter from "./routers/review.router";
import sportRouter from "./routers/sport.router";
import shopRouter from "./routers/shop.router";
import teammateAdRouter from "./routers/teammate-ad.router";
import tournamentRouter from "./routers/tournament.router";
import trainingRouter from "./routers/training.router";
import userRouter from "./routers/user.router";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

mongoose
  .connect("mongodb://127.0.0.1:27017/sportsphere")
  .then(() => {
    console.log("Uspesno povezivanje sa MongoDB bazom");
  })
  .catch((error) => {
    console.error("Povezivanje sa MongoDB bazom nije uspelo:", error.message);
  });

app.get("/", (_req, res) => {
  res.json({ message: "SportSphere Hub API radi" });
});

const router = express.Router();
router.use("/facilities", facilityRouter);
router.use("/reservations", reservationRouter);
router.use("/reports", reportRouter);
router.use("/reviews", reviewRouter);
router.use("/users", userRouter);
router.use("/sports", sportRouter);
router.use("/shop", shopRouter);
router.use("/teammate-ads", teammateAdRouter);
router.use("/tournaments", tournamentRouter);
router.use("/trainings", trainingRouter);
app.use("/", router);

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Zahtev nije uspeo:", error.message);
    res.status(400).json({ message: error.message });
  },
);

app.listen(4000, () => console.log("Express radi na portu 4000"));
