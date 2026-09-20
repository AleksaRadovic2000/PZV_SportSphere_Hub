import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { Training } from '../../../models/training';
import { FacilityService } from '../../../services/facility';
import { TrainingService } from '../../../services/training';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-employee-operations',
  imports: [FormsModule],
  templateUrl: './employee-operations.html',
})
export class EmployeeOperations implements OnInit {
  private facilityService = inject(FacilityService);
  private trainingService = inject(TrainingService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  trainings: Training[] = [];
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

  canMarkAttendance(training: Training) {
    const now = Date.now();
    const start = new Date(training.startDateTime).getTime();
    return training.status === 'scheduled' && now >= start && now <= start + 10 * 60 * 1000;
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

  formatDateTime(value: string) {
    return new Date(value).toLocaleString('sr-Latn-RS');
  }
}
