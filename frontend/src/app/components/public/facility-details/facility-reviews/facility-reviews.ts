import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FacilityDetailsResponse } from '../../../../models/facility';
import { AthleteReservation } from '../../../../models/reservation';
import { FacilityReview } from '../../../../models/review';
import { ReservationService } from '../../../../services/reservation';
import { ReviewService } from '../../../../services/review';
import { UserService } from '../../../../services/user';
import { formatDateTime } from '../../../../shared/date-utils';

@Component({
  selector: 'app-facility-reviews',
  imports: [FormsModule],
  templateUrl: './facility-reviews.html',
})
export class FacilityReviews implements OnInit {
  @Input() details = new FacilityDetailsResponse();
  private reservationService = inject(ReservationService);
  private reviewService = inject(ReviewService);
  private userService = inject(UserService);
  formatDateTime = formatDateTime;
  reviews: FacilityReview[] = [];
  reviewReservations: AthleteReservation[] = [];
  reviewReservationId = '';
  reviewReaction = 'like';
  reviewComment = '';
  message = '';
  success = false;

  ngOnInit() {
    this.loadReviews();
    this.loadReviewReservations();
  }

  get user() {
    return this.userService.getLoggedUser();
  }

  loadReviews() {
    this.reviewService.getRecentReviews(this.details.facility._id).subscribe({
      next: (reviews) => (this.reviews = reviews),
      error: () => {
        this.message = 'Komentare nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  loadReviewReservations() {
    const user = this.user;
    if (!user) return;

    this.reservationService.getAthleteReservations(user.username).subscribe({
      next: (reservations) => {
        this.reviewService
          .getReviewedReservationIds(user.username, this.details.facility._id)
          .subscribe({
            next: (reviewedIds) => {
              this.reviewReservations = reservations.filter(
                (reservation) =>
                  reservation.facilityId === this.details.facility._id &&
                  reservation.status === 'attended' &&
                  !reviewedIds.includes(reservation._id)
              );
              this.reviewReservationId = this.reviewReservations[0]?._id || '';
            },
            error: () => {
              this.message = 'Ocenjene rezervacije nije moguce ucitati.';
              this.success = false;
            },
          });
      },
      error: () => {
        this.message = 'Rezervacije za ocenjivanje nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  createReview() {
    const user = this.user;
    this.message = '';
    this.success = false;

    if (!user || !this.reviewReservationId) {
      this.message = 'Izaberite odigranu rezervaciju.';
      return;
    }

    if (this.reviewComment.length > 500) {
      this.message = 'Komentar moze imati najvise 500 karaktera.';
      return;
    }

    this.reviewService
      .createReview(
        this.reviewReservationId,
        user.username,
        this.reviewReaction,
        this.reviewComment
      )
      .subscribe({
        next: (response) => {
          if (this.reviewReaction === 'like') {
            this.details.likes++;
          } else {
            this.details.dislikes++;
          }

          this.reviewReservations = this.reviewReservations.filter(
            (reservation) => reservation._id !== this.reviewReservationId
          );
          this.reviewReservationId = this.reviewReservations[0]?._id || '';
          this.reviewComment = '';
          this.message = response.message;
          this.success = true;
          this.loadReviews();
        },
        error: (error) =>
          (this.message = error.error?.message || 'Ocenjivanje objekta nije uspelo.'),
      });
  }

  isOwnReview(review: FacilityReview) {
    return review.athleteUsername === this.user?.username;
  }
}
