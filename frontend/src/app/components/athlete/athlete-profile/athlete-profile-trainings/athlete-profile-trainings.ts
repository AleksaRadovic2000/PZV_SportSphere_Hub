import { Component, inject, OnInit } from '@angular/core';
import { Training } from '../../../../models/training';
import { TrainingService } from '../../../../services/training';
import { UserService } from '../../../../services/user';
import { formatDateTime } from '../../../../shared/date-utils';
import { getSerbianLabel } from '../../../../shared/serbian-label';

@Component({
  selector: 'app-athlete-profile-trainings',
  templateUrl: './athlete-profile-trainings.html',
})
export class AthleteProfileTrainings implements OnInit {
  private trainingService = inject(TrainingService);
  private userService = inject(UserService);
  label = getSerbianLabel;
  formatDateTime = formatDateTime;
  trainings: Training[] = [];
  message = '';
  ngOnInit() {
    const user = this.userService.getLoggedUser();
    if (!user) return;
    this.trainingService.getAthleteTrainings(user.username).subscribe({
      next: (trainings) => (this.trainings = trainings),
      error: (error) => (this.message = error.error?.message || 'Treninge nije moguce ucitati.'),
    });
  }
}
