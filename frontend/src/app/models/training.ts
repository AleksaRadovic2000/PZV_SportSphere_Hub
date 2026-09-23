export class Trainer {
  _id = '';
  firstName = '';
  lastName = '';
  facilityId = '';
  sports: string[] = [];
  specialization = '';
  averageRating = 0;
  pricePerHour = 0;
  active = true;
  facilityName = '';
}

export class Training {
  _id = '';
  athleteUsername = '';
  trainerId = '';
  facilityId = '';
  resourceId = '';
  sport = '';
  startDateTime = '';
  endDateTime = '';
  price = 0;
  status = 'scheduled';
  trainerName = '';
  facilityName = '';
  resourceName = '';
}

export class TrainingResponse {
  message = '';
  training = new Training();
}
