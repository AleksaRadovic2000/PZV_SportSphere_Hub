export class FacilityReview {
  _id = '';
  reservationId = '';
  athleteUsername = '';
  facilityId = '';
  reaction = 'like';
  comment = '';
  createdAt = '';
}

export class ReviewResponse {
  message = '';
  review = new FacilityReview();
}
