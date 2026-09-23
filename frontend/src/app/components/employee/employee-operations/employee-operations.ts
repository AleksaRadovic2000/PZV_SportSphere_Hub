import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { EmployeeReservation } from '../../../models/reservation';
import { Training } from '../../../models/training';
import { FacilityService } from '../../../services/facility';
import { ReservationService } from '../../../services/reservation';
import { TrainingService } from '../../../services/training';
import { UserService } from '../../../services/user';

import { getSerbianLabel } from '../../../shared/serbian-label';
import { formatDateTime } from '../../../shared/date-utils';

@Component({
  selector: 'app-employee-operations',
  imports: [FormsModule],
  templateUrl: './employee-operations.html',
})
export class EmployeeOperations implements OnInit {
  label = getSerbianLabel;
  formatDateTime = formatDateTime;
  private facilityService = inject(FacilityService);
  private trainingService = inject(TrainingService);
  private reservationService = inject(ReservationService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  trainings: Training[] = [];
  reservations: EmployeeReservation[] = [];
  facilityId = '';
  message = '';
  success = false;

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities.filter((facility) => facility.status === 'active');

        if (this.facilities.length > 0) {
          this.facilityId = this.facilities[0]._id;
          this.loadReservations();
          this.loadTrainings();
        }
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
      },
    });
  }

  loadTrainings() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId) {
      this.trainings = [];
      return;
    }

    this.trainingService.getFacilityTrainings(this.facilityId, user.username).subscribe({
      next: (trainings) => {
        this.trainings = trainings;
      },
      error: (error) => {
        this.message = error.error?.message || 'Treninge nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  facilityChanged() {
    this.loadReservations();
    this.loadTrainings();
  }

  loadReservations() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId) {
      this.reservations = [];
      return;
    }

    this.reservationService.getFacilityReservations(this.facilityId, user.username).subscribe({
      next: (reservations) => {
        this.reservations = reservations;
      },
      error: (error) => {
        this.message = error.error?.message || 'Rezervacije nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  canMarkAttendance(item: Training | EmployeeReservation) {
    const now = Date.now();
    const start = new Date(item.startDateTime).getTime();
    return item.status === 'scheduled' && now >= start && now <= start + 10 * 60 * 1000;
  }

  markReservationAttendance(reservation: EmployeeReservation, attended: boolean) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.reservationService.markAttendance(reservation._id, user.username, attended).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadReservations();
      },
      error: (error) => {
        this.message = error.error?.message || 'Evidencija rezervacije nije uspela.';
        this.success = false;
      },
    });
  }

  markAttendance(training: Training, attended: boolean) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.trainingService.markAttendance(training._id, user.username, attended).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadTrainings();
      },
      error: (error) => {
        this.message = error.error?.message || 'Evidencija treninga nije uspela.';
        this.success = false;
      },
    });
  }
}
