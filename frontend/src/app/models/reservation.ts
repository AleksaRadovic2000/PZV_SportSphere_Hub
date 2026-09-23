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
  type = 'reservation';
}

export class AthleteReservation extends Reservation {
  facilityName = '';
  city = '';
  resourceName = '';
}

export class EmployeeReservation extends Reservation {
  resourceName = '';
}

export class ReservationResponse {
  message = '';
  reservation = new Reservation();
}

export class StatisticItem {
  label = '';
  value = 0;
}

export class AthleteStatistics {
  playedBySport: StatisticItem[] = [];
  reservedBySport: StatisticItem[] = [];
  reservationsByMonth: StatisticItem[] = [];
  totalEquipmentSpending = 0;
}
