import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sport } from '../../../models/sport';
import { Trainer } from '../../../models/training';
import { SportService } from '../../../services/sport';
import { TrainingService } from '../../../services/training';

@Component({
  selector: 'app-admin-system-data',
  imports: [FormsModule],
  templateUrl: './admin-system-data.html',
})
export class AdminSystemData implements OnInit {
  private sportService = inject(SportService);
  private trainingService = inject(TrainingService);

  sports: Sport[] = [];
  trainers: Trainer[] = [];
  sportName = '';
  message = '';
  success = false;

  ngOnInit() {
    this.loadSports();
    this.loadTrainers();
  }

  loadSports() {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: (error) => {
        this.message = error.error?.message || 'Sportove nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  addSport() {
    if (!this.sportName.trim()) {
      this.message = 'Unesite naziv sporta.';
      this.success = false;
      return;
    }

    this.sportService.addSport(this.sportName).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.sportName = '';
        this.loadSports();
      },
      error: (error) => {
        this.message = error.error?.message || 'Dodavanje sporta nije uspelo.';
        this.success = false;
      },
    });
  }

  loadTrainers() {
    this.trainingService.getAllTrainers().subscribe({
      next: (trainers) => {
        this.trainers = trainers;
      },
      error: (error) => {
        this.message = error.error?.message || 'Trenere nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  deactivateTrainer(trainer: Trainer) {
    this.trainingService.deactivateTrainer(trainer._id).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadTrainers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Deaktivacija trenera nije uspela.';
        this.success = false;
      },
    });
  }
}
