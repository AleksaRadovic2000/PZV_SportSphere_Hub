import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility, FacilityResource } from '../../../models/facility';
import { Trainer, Training } from '../../../models/training';
import { FacilityService } from '../../../services/facility';
import { TrainingService } from '../../../services/training';
import { UserService } from '../../../services/user';
import { formatDateTime } from '../../../shared/date-utils';

@Component({
  selector: 'app-athlete-trainings',
  imports: [FormsModule],
  templateUrl: './athlete-trainings.html',
})
export class AthleteTrainings implements OnInit {
  formatDateTime = formatDateTime;
  private facilityService = inject(FacilityService);
  private trainingService = inject(TrainingService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  sports: string[] = [];
  resources: FacilityResource[] = [];
  trainers: Trainer[] = [];
  trainerSchedule: Training[] = [];
  facilityId = '';
  sport = '';
  trainerId = '';
  resourceId = '';
  date = '';
  startTime = '';
  endTime = '';
  message = '';
  success = false;

  ngOnInit() {
    this.facilityService.search('', [], '', '').subscribe({
      next: (facilities) => {
        this.facilities = facilities;
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
      },
    });
  }

  facilityChanged() {
    const facility = this.getSelectedFacility();
    const sportSet = new Set<string>();

    facility?.resources.forEach((resource) => {
      resource.sportPrices.forEach((price) => sportSet.add(price.sport));
    });

    this.sports = [...sportSet];
    this.sport = '';
    this.resources = [];
    this.trainers = [];
    this.trainerId = '';
    this.resourceId = '';
    this.trainerSchedule = [];
  }

  sportChanged() {
    const facility = this.getSelectedFacility();
    this.resources =
      facility?.resources.filter((resource) =>
        resource.sportPrices.some((price) => price.sport === this.sport)
      ) || [];
    this.resourceId = '';
    this.trainers = [];
    this.trainerId = '';
    this.trainerSchedule = [];
  }

  searchTrainers() {
    this.message = '';
    this.success = false;

    if (!this.facilityId || !this.sport) {
      this.message = 'Izaberite objekat i sport.';
      return;
    }

    this.trainingService.searchTrainers(this.facilityId, this.sport).subscribe({
      next: (trainers) => {
        this.trainers = trainers;
        this.trainerId = '';
        this.trainerSchedule = [];

        if (trainers.length === 0) {
          this.message = 'Nema aktivnih trenera za izabrani sport.';
        }
      },
      error: (error) => {
        this.message = error.error?.message || 'Pretraga trenera nije uspela.';
      },
    });
  }

  selectTrainer(trainer: Trainer) {
    this.trainerId = trainer._id;
    this.loadTrainerSchedule();
  }

  loadTrainerSchedule() {
    if (!this.trainerId) {
      return;
    }

    this.trainingService.getTrainerSchedule(this.trainerId).subscribe({
      next: (schedule) => {
        this.trainerSchedule = schedule;
      },
      error: (error) => {
        this.message = error.error?.message || 'Raspored trenera nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  scheduleTraining() {
    const user = this.userService.getLoggedUser();

    if (
      !user ||
      !this.facilityId ||
      !this.sport ||
      !this.trainerId ||
      !this.resourceId ||
      !this.date ||
      !this.startTime ||
      !this.endTime
    ) {
      this.message = 'Popunite sva polja za zakazivanje.';
      this.success = false;
      return;
    }

    const startDateTime = new Date(`${this.date}T${this.startTime}:00`);
    const endDateTime = new Date(`${this.date}T${this.endTime}:00`);
    const duration = (endDateTime.getTime() - startDateTime.getTime()) / (60 * 60 * 1000);

    if (
      startDateTime <= new Date() ||
      endDateTime <= startDateTime ||
      !this.startTime.endsWith(':00') ||
      !this.endTime.endsWith(':00') ||
      !Number.isInteger(duration)
    ) {
      this.message = 'Termin mora biti u buducnosti i trajati ceo broj sati.';
      this.success = false;
      return;
    }

    this.trainingService
      .createTraining(
        user.username,
        this.trainerId,
        this.facilityId,
        this.resourceId,
        this.sport,
        startDateTime,
        endDateTime
      )
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.success = true;
          this.startTime = '';
          this.endTime = '';
          this.loadTrainerSchedule();
        },
        error: (error) => {
          this.message = error.error?.message || 'Zakazivanje treninga nije uspelo.';
          this.success = false;
        },
      });
  }

  getExpectedPrice() {
    const trainer = this.trainers.find((item) => item._id === this.trainerId);

    if (!trainer || !this.date || !this.startTime || !this.endTime) {
      return 0;
    }

    const start = new Date(`${this.date}T${this.startTime}:00`);
    const end = new Date(`${this.date}T${this.endTime}:00`);
    const duration = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    return duration > 0 ? duration * trainer.pricePerHour : 0;
  }

  private getSelectedFacility() {
    return this.facilities.find((facility) => facility._id === this.facilityId);
  }
}
