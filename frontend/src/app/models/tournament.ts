export class TournamentApplication {
  _id = '';
  athleteUsername = '';
  status = 'pending';
}

export class Tournament {
  _id = '';
  facilityId = '';
  facilityName = '';
  createdByUsername = '';
  name = '';
  sport = '';
  startDateTime = '';
  status = 'open';
  applications: TournamentApplication[] = [];
}

export class TournamentResponse {
  message = '';
  tournament = new Tournament();
}
