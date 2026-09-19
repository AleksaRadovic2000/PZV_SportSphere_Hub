export class JoinRequest {
  _id = '';
  athleteUsername = '';
  status = 'pending';
}

export class TeammateAd {
  _id = '';
  authorUsername = '';
  sport = '';
  city = '';
  startDateTime = '';
  endDateTime = '';
  playersNeeded = 1;
  status = 'active';
  requests: JoinRequest[] = [];
}

export class TeammateAdResponse {
  message = '';
  ad = new TeammateAd();
}
