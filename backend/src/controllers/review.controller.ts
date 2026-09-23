import express from "express";
import mongoose from "mongoose";
import FacilityReviewModel from "../models/facility-review";
import ReservationModel from "../models/reservation";

export class ReviewController {
  create = async (req: express.Request, res: express.Response) => {
    let reservationId = req.body.reservationId;
    let athleteUsername = req.body.athleteUsername;
    let reaction = req.body.reaction;
    let commentValue = req.body.comment;
    let comment = "";

    if (
      !mongoose.isValidObjectId(reservationId) ||
      !athleteUsername ||
      !["like", "dislike"].includes(reaction)
    ) {
      res.status(400).json({ message: "Podaci o oceni nisu ispravni" });
      return;
    }

    athleteUsername = athleteUsername.trim();

    if (typeof commentValue === "string") {
      comment = commentValue.trim();
    }

    if (comment.length > 500) {
      res.status(400).json({ message: "Komentar moze imati najvise 500 karaktera" });
      return;
    }

    try {
      const reservation = await ReservationModel.findOne({
        _id: reservationId,
        athleteUsername,
        status: "attended",
      });

      if (!reservation) {
        res.status(403).json({ message: "Moze se oceniti samo rezervacija kojoj je sportista prisustvovao" });
        return;
      }

      const existingReview = await FacilityReviewModel.findOne({ reservationId });

      if (existingReview) {
        res.status(409).json({ message: "Ova rezervacija je vec ocenjena" });
        return;
      }

      const review = await FacilityReviewModel.create({
        reservationId,
        athleteUsername,
        facilityId: reservation.facilityId,
        reaction,
        comment,
      });
      res.status(201).json({ message: "Ocena je uspesno dodata", review });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ message: "Ova rezervacija je vec ocenjena" });
        return;
      }

      console.error("Dodavanje ocene nije uspelo:", error);
      res.status(500).json({ message: "Dodavanje ocene nije uspelo" });
    }
  };

  getRecent = async (req: express.Request, res: express.Response) => {
    let facilityId = req.params.facilityId;

    if (!mongoose.isValidObjectId(facilityId)) {
      res.status(400).json({ message: "ID objekta nije ispravan" });
      return;
    }

    try {
      const reviews = await FacilityReviewModel.find({ facilityId, comment: { $ne: "" } })
        .sort({ createdAt: -1 })
        .limit(5);
      res.json(reviews);
    } catch (error) {
      console.error("Ucitavanje ocena nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje ocena nije uspelo" });
    }
  };

  getReviewedReservationIds = async (req: express.Request, res: express.Response) => {
    let athleteUsername = req.params.athleteUsername;
    let facilityId = req.params.facilityId;

    if (
      typeof athleteUsername !== "string" ||
      !athleteUsername ||
      !mongoose.isValidObjectId(facilityId)
    ) {
      res.status(400).json({ message: "Korisnicko ime sportiste i ID objekta su obavezni" });
      return;
    }

    athleteUsername = athleteUsername.trim();

    try {
      const reviews = await FacilityReviewModel.find({ athleteUsername, facilityId });
      const reservationIds = reviews.map((review) => review.reservationId.toString());
      res.json(reservationIds);
    } catch (error) {
      console.error("Ucitavanje ocenjenih rezervacija nije uspelo:", error);
      res.status(500).json({ message: "Ucitavanje ocenjenih rezervacija nije uspelo" });
    }
  };
}
