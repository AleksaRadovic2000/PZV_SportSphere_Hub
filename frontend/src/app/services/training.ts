import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { Trainer, Training, TrainingResponse } from '../models/training';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/trainings`;

  searchTrainers(facilityId: string, sport: string) {
    return this.http.post<Trainer[]>(`${this.uri}/trainers/search`, { facilityId, sport });
  }

  getTrainerSchedule(trainerId: string) {
    return this.http.post<Training[]>(`${this.uri}/trainers/schedule`, { trainerId });
  }

  createTraining(
    athleteUsername: string,
    trainerId: string,
    facilityId: string,
    resourceId: string,
    sport: string,
    startDateTime: Date,
    endDateTime: Date,
  ) {
    return this.http.post<TrainingResponse>(`${this.uri}/create`, {
      athleteUsername,
      trainerId,
      facilityId,
      resourceId,
      sport,
      startDateTime,
      endDateTime,
    });
  }

  getAthleteTrainings(username: string) {
    return this.http.get<Training[]>(`${this.uri}/athlete/${username}`);
  }

  getFacilityTrainings(facilityId: string, employeeUsername: string) {
    const params = new HttpParams().set('employeeUsername', employeeUsername);
    return this.http.get<Training[]>(`${this.uri}/facility/${facilityId}`, { params });
  }

  markAttendance(id: string, employeeUsername: string, attended: boolean) {
    return this.http.post<TrainingResponse>(`${this.uri}/attendance`, {
      id,
      employeeUsername,
      attended,
    });
  }
}
