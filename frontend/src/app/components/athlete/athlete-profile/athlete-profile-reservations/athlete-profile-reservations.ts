import { Component, inject, OnInit } from '@angular/core';
import { AthleteReservation } from '../../../../models/reservation';
import { ReservationService } from '../../../../services/reservation';
import { UserService } from '../../../../services/user';
import { formatDateTime } from '../../../../shared/date-utils';
import { getSerbianLabel } from '../../../../shared/serbian-label';

@Component({
  selector: 'app-athlete-profile-reservations',
  templateUrl: './athlete-profile-reservations.html',
})
export class AthleteProfileReservations implements OnInit {
  private reservationService = inject(ReservationService);
  private userService = inject(UserService);
  label = getSerbianLabel;
  formatDateTime = formatDateTime;
  reservations: AthleteReservation[] = [];
  reservationResults: AthleteReservation[] = [];
  message = '';
  success = false;
  sortColumn = '';
  sortDirection = 'asc';
  ngOnInit() {
    this.loadReservations();
  }
  loadReservations() {
    const user = this.userService.getLoggedUser();
    if (!user) return;
    this.reservationService.getAthleteReservations(user.username).subscribe({
      next: (reservations) => {
        this.reservationResults = reservations;
        this.reservations = [...reservations];
      },
      error: (error) => (this.message = error.error?.message || 'Rezervacije nije moguce ucitati.'),
    });
  }
  sortReservations(column: string) {
    if (this.sortColumn === column)
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    this.reservations = [...this.reservationResults].sort(
      (first, second) =>
        this.getSortValue(first, column).localeCompare(this.getSortValue(second, column)) *
        direction
    );
  }
  canCancel(reservation: AthleteReservation) {
    return (
      reservation.status === 'scheduled' &&
      (new Date(reservation.startDateTime).getTime() - Date.now()) / (60 * 60 * 1000) >= 12
    );
  }
  cancelReservation(reservation: AthleteReservation) {
    const user = this.userService.getLoggedUser();
    if (!user) return;
    this.message = '';
    this.success = false;
    this.reservationService.cancelReservation(reservation._id, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadReservations();
      },
      error: (error) =>
        (this.message = error.error?.message || 'Otkazivanje rezervacije nije uspelo.'),
    });
  }
  private getSortValue(reservation: AthleteReservation, column: string) {
    if (column === 'city') return reservation.city;
    if (column === 'resource') return reservation.resourceName;
    if (column === 'sport') return reservation.sport;
    if (column === 'interval') return reservation.startDateTime;
    if (column === 'status') return reservation.status;
    return reservation.facilityName;
  }
}
