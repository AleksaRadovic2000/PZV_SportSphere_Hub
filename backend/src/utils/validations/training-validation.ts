import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import ReservationModel from "../../models/reservation";
import TrainerModel from "../../models/trainer";
import TrainingModel from "../../models/training";

const hourInMilliseconds = 60 * 60 * 1000;

export const validateTraining = async (
  trainerId: string,
  facilityId: string,
  resourceId: string,
  sport: string,
  startDateTime: Date,
  endDateTime: Date,
  trainingId = "",
  athleteUsername = "",
) => {
  if (
    !mongoose.isValidObjectId(trainerId) ||
    !mongoose.isValidObjectId(facilityId) ||
    !mongoose.isValidObjectId(resourceId)
  ) {
    return { message: "ID trenera, objekta ili terena nije ispravan", pricePerHour: 0 };
  }

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    return { message: "Datum i vreme treninga nisu ispravni", pricePerHour: 0 };
  }

  if (startDateTime <= new Date()) {
    return { message: "Trening mora poceti u buducnosti", pricePerHour: 0 };
  }

  if (
    startDateTime.getMinutes() !== 0 ||
    startDateTime.getSeconds() !== 0 ||
    endDateTime.getMinutes() !== 0 ||
    endDateTime.getSeconds() !== 0
  ) {
    return { message: "Trening mora poceti i zavrsiti se na pun sat", pricePerHour: 0 };
  }

  const duration = endDateTime.getTime() - startDateTime.getTime();

  if (duration < hourInMilliseconds || duration % hourInMilliseconds !== 0) {
    return { message: "Trening mora trajati jedan ili vise punih sati", pricePerHour: 0 };
  }

  if (
    startDateTime.getFullYear() !== endDateTime.getFullYear() ||
    startDateTime.getMonth() !== endDateTime.getMonth() ||
    startDateTime.getDate() !== endDateTime.getDate()
  ) {
    return { message: "Trening mora poceti i zavrsiti se istog dana", pricePerHour: 0 };
  }

  const trainer = await TrainerModel.findOne({
    _id: trainerId,
    facilityId,
    sports: sport,
    active: true,
  });

  if (!trainer) {
    return { message: "Aktivan trener za izabrani sport nije pronadjen", pricePerHour: 0 };
  }

  const facility = await FacilityModel.findOne({ _id: facilityId, status: "active" });

  if (!facility) {
    return { message: "Aktivan objekat nije pronadjen", pricePerHour: 0 };
  }

  if (athleteUsername) {
    const reservationNoShows = await ReservationModel.countDocuments({
      athleteUsername,
      facilityId,
      status: "no_show",
    });
    const trainingNoShows = await TrainingModel.countDocuments({
      athleteUsername,
      facilityId,
      status: "no_show",
    });

    if (reservationNoShows + trainingNoShows >= facility.allowedNoShows) {
      return {
        message: "Sportista je dostigao dozvoljeni broj nedolazaka za ovaj objekat",
        pricePerHour: 0,
      };
    }
  }

  const resource = facility.resources.find((item) => item._id.toString() === resourceId);

  if (!resource || !resource.sportPrices.some((item) => item.sport === sport)) {
    return { message: "Izabrani teren ne podrzava ovaj sport", pricePerHour: 0 };
  }

  const javascriptDay = startDateTime.getDay();
  const day = javascriptDay === 0 ? 7 : javascriptDay;
  const workingHours = facility.workingHours.find((item) => item.day === day);

  if (!workingHours) {
    return { message: "Objekat ne radi izabranog dana", pricePerHour: 0 };
  }

  const startMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
  const endMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();

  if (
    startMinutes < timeToMinutes(workingHours.from) ||
    endMinutes > timeToMinutes(workingHours.to)
  ) {
    return { message: "Trening mora biti u okviru radnog vremena objekta", pricePerHour: 0 };
  }

  const trainerTrainingQuery: any = {
    trainerId,
    status: "scheduled",
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  };

  if (trainingId) {
    trainerTrainingQuery._id = { $ne: trainingId };
  }

  const overlappingTrainerTraining = await TrainingModel.findOne(trainerTrainingQuery);

  if (overlappingTrainerTraining) {
    return { message: "Trener nije dostupan u izabranom terminu", pricePerHour: 0 };
  }

  const resourceTrainingQuery: any = {
    resourceId,
    status: "scheduled",
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  };

  if (trainingId) {
    resourceTrainingQuery._id = { $ne: trainingId };
  }

  const overlappingResourceTraining = await TrainingModel.findOne(resourceTrainingQuery);

  if (overlappingResourceTraining) {
    return { message: "Teren je zauzet drugim treningom", pricePerHour: 0 };
  }

  const overlappingReservation = await ReservationModel.findOne({
    resourceId,
    status: "scheduled",
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  });

  if (overlappingReservation) {
    return { message: "Teren je zauzet rezervacijom", pricePerHour: 0 };
  }

  return { message: "", pricePerHour: trainer.pricePerHour };
};

const timeToMinutes = (time: string) => {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
};
