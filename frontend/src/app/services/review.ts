import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { FacilityReview, ReviewResponse } from '../models/review';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/reviews`;

  createReview(reservationId: string, athleteUsername: string, reaction: string, comment: string) {
    return this.http.post<ReviewResponse>(`${this.uri}/create`, {
      reservationId,
      athleteUsername,
      reaction,
      comment,
    });
  }

  getRecentReviews(facilityId: string) {
    return this.http.get<FacilityReview[]>(`${this.uri}/recent/${facilityId}`);
  }

  getReviewedReservationIds(athleteUsername: string, facilityId: string) {
    return this.http.get<string[]>(`${this.uri}/reviewed/${athleteUsername}/${facilityId}`);
  }
}
