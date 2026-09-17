export class Reservation {
  _id = '';
  athleteUsername = '';
  facilityId = '';
  resourceId = '';
  sport = '';
  startDateTime = '';
  endDateTime = '';
  price = 0;
  status = 'scheduled';
}

export class AthleteReservation extends Reservation {
  facilityName = '';
  city = '';
  resourceName = '';
}

export class ReservationResponse {
  message = '';
  reservation = new Reservation();
}
