import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AthleteReservation } from '../../../models/reservation';
import { User } from '../../../models/user';
import { ReservationService } from '../../../services/reservation';
import { UserService } from '../../../services/user';
import { SportSelector } from '../../shared/sport-selector/sport-selector';

@Component({
  selector: 'app-athlete-profile',
  imports: [FormsModule, SportSelector],
  templateUrl: './athlete-profile.html',
})
export class AthleteProfile implements OnInit {
  private userService = inject(UserService);
  private reservationService = inject(ReservationService);

  user = new User();
  profileImage: File | null = null;
  profileImagePreview = '';
  message = '';
  success = false;
  loading = false;
  reservations: AthleteReservation[] = [];
  reservationResults: AthleteReservation[] = [];
  reservationMessage = '';
  reservationSuccess = false;
  reservationSortColumn = '';
  reservationSortDirection = 'asc';

  ngOnInit() {
    let loggedUser = this.userService.getLoggedUser();

    if (!loggedUser) {
      return;
    }

    this.userService.getProfile(loggedUser.username).subscribe({
      next: (user) => {
        this.user = user;
        this.profileImagePreview = this.userService.getProfileImageUrl(user.profileImage);
      },
      error: (error) => {
        this.message = error.error?.message || 'Profil nije moguce ucitati.';
      },
    });

    this.loadReservations();
  }

  onProfileImageSelected(event: Event) {
    let input = event.target as HTMLInputElement;
    let file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.message = 'Profilna slika mora biti PNG ili JPG fajl.';
      input.value = '';
      return;
    }

    this.profileImage = file;
    let reader = new FileReader();
    reader.onload = () => {
      this.profileImagePreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  updateProfile() {
    this.message = '';
    this.success = false;

    if (
      !this.user.firstName.trim() ||
      !this.user.lastName.trim() ||
      !this.user.phone.trim() ||
      !this.user.email.trim()
    ) {
      this.message = 'Popunite sva obavezna polja.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.user.email)) {
      this.message = 'Email adresa nije ispravna.';
      return;
    }

    if (this.user.favouriteSports.length > 5) {
      this.message = 'Mozete izabrati najvise pet sportova.';
      return;
    }

    this.loading = true;
    this.userService.updateProfile(this.user, this.profileImage).subscribe({
      next: (response) => {
        this.user = response.user;
        this.userService.saveLoggedUser(response.user);
        this.profileImagePreview = this.userService.getProfileImageUrl(response.user.profileImage);
        this.profileImage = null;
        this.message = response.message;
        this.success = true;
        this.loading = false;
      },
      error: (error) => {
        this.message = error.error?.message || 'Izmena profila nije uspela.';
        this.loading = false;
      },
    });
  }

  loadReservations() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.reservationService.getAthleteReservations(user.username).subscribe({
      next: (reservations) => {
        this.reservationResults = reservations;
        this.reservations = [...reservations];
      },
      error: (error) => {
        this.reservationMessage = error.error?.message || 'Rezervacije nije moguce ucitati.';
      },
    });
  }

  sortReservations(column: string) {
    if (this.reservationSortColumn === column) {
      this.reservationSortDirection = this.reservationSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.reservationSortColumn = column;
      this.reservationSortDirection = 'asc';
    }

    const direction = this.reservationSortDirection === 'asc' ? 1 : -1;
    this.reservations = [...this.reservationResults].sort((first, second) => {
      const firstValue = this.getReservationSortValue(first, column);
      const secondValue = this.getReservationSortValue(second, column);
      return firstValue.localeCompare(secondValue) * direction;
    });
  }

  canCancel(reservation: AthleteReservation) {
    const hoursUntilStart =
      (new Date(reservation.startDateTime).getTime() - Date.now()) / (60 * 60 * 1000);
    return reservation.status === 'scheduled' && hoursUntilStart >= 12;
  }

  cancelReservation(reservation: AthleteReservation) {
    this.reservationMessage = '';
    this.reservationSuccess = false;
    this.reservationService.cancelReservation(reservation._id, this.user.username).subscribe({
      next: (response) => {
        this.reservationMessage = response.message;
        this.reservationSuccess = true;
        this.loadReservations();
      },
      error: (error) => {
        this.reservationMessage = error.error?.message || 'Otkazivanje rezervacije nije uspelo.';
      },
    });
  }

  formatDateTime(value: string) {
    return new Date(value).toLocaleString('sr-Latn-RS');
  }

  private getReservationSortValue(reservation: AthleteReservation, column: string) {
    if (column === 'city') {
      return reservation.city;
    }

    if (column === 'resource') {
      return reservation.resourceName;
    }

    if (column === 'sport') {
      return reservation.sport;
    }

    if (column === 'interval') {
      return reservation.startDateTime;
    }

    if (column === 'status') {
      return reservation.status;
    }

    return reservation.facilityName;
  }
}
