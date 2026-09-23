import mongoose from "mongoose";
import FacilityModel from "../../models/facility";
import ReservationModel from "../../models/reservation";
import TrainingModel from "../../models/training";

const hourInMilliseconds = 60 * 60 * 1000;

export const validateReservation = async (
  facilityId: string,
  resourceId: string,
  sport: string,
  startDateTime: Date,
  endDateTime: Date,
  reservationId = "",
  athleteUsername = "",
) => {
  if (!mongoose.isValidObjectId(facilityId) || !mongoose.isValidObjectId(resourceId)) {
    return { message: "ID objekta ili terena nije ispravan", pricePerHour: 0 };
  }

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    return { message: "Datum i vreme rezervacije nisu ispravni", pricePerHour: 0 };
  }

  if (startDateTime <= new Date()) {
    return { message: "Rezervacija mora poceti u buducnosti", pricePerHour: 0 };
  }

  if (
    startDateTime.getMinutes() !== 0 ||
    startDateTime.getSeconds() !== 0 ||
    endDateTime.getMinutes() !== 0 ||
    endDateTime.getSeconds() !== 0
  ) {
    return { message: "Rezervacija mora poceti i zavrsiti se na pun sat", pricePerHour: 0 };
  }

  const duration = endDateTime.getTime() - startDateTime.getTime();

  if (duration < hourInMilliseconds || duration % hourInMilliseconds !== 0) {
    return { message: "Rezervacija mora trajati jedan ili vise punih sati", pricePerHour: 0 };
  }

  if (
    startDateTime.getFullYear() !== endDateTime.getFullYear() ||
    startDateTime.getMonth() !== endDateTime.getMonth() ||
    startDateTime.getDate() !== endDateTime.getDate()
  ) {
    return { message: "Rezervacija mora poceti i zavrsiti se istog dana", pricePerHour: 0 };
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

  if (!resource) {
    return { message: "Teren nije pronadjen u ovom objektu", pricePerHour: 0 };
  }

  const sportPrice = resource.sportPrices.find((item) => item.sport === sport);

  if (!sportPrice) {
    return { message: "Izabrani sport nije dostupan na ovom terenu", pricePerHour: 0 };
  }

  const javascriptDay = startDateTime.getDay();
  const day = javascriptDay === 0 ? 7 : javascriptDay;
  const workingHours = facility.workingHours.find((item) => item.day === day);

  if (!workingHours) {
    return { message: "Objekat ne radi izabranog dana", pricePerHour: 0 };
  }

  const startMinutes = startDateTime.getHours() * 60 + startDateTime.getMinutes();
  const endMinutes = endDateTime.getHours() * 60 + endDateTime.getMinutes();
  const workingStart = timeToMinutes(workingHours.from);
  const workingEnd = timeToMinutes(workingHours.to);

  if (startMinutes < workingStart || endMinutes > workingEnd) {
    return { message: "Rezervacija mora biti u okviru radnog vremena objekta", pricePerHour: 0 };
  }

  const reservationQuery: any = {
    resourceId,
    status: "scheduled",
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  };

  if (reservationId) {
    reservationQuery._id = { $ne: reservationId };
  }

  const overlappingReservation = await ReservationModel.findOne(reservationQuery);

  if (overlappingReservation) {
    return { message: "Izabrani termin se preklapa sa postojecom rezervacijom", pricePerHour: 0 };
  }

  const overlappingTraining = await TrainingModel.findOne({
    resourceId,
    status: "scheduled",
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  });

  if (overlappingTraining) {
    return { message: "Izabrani termin se preklapa sa individualnim treningom", pricePerHour: 0 };
  }

  return { message: "", pricePerHour: sportPrice.pricePerHour };
};

const timeToMinutes = (time: string) => {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
};
