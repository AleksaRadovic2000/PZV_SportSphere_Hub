import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { Tournament, TournamentResponse } from '../models/tournament';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/tournaments`;

  getOpen() {
    return this.http.get<Tournament[]>(`${this.uri}/open`);
  }

  getForAthlete(username: string) {
    return this.http.get<Tournament[]>(`${this.uri}/athlete/${username}`);
  }

  getForEmployee(username: string) {
    return this.http.get<Tournament[]>(`${this.uri}/employee/${username}`);
  }

  create(
    facilityId: string,
    createdByUsername: string,
    name: string,
    sport: string,
    startDateTime: Date
  ) {
    return this.http.post<TournamentResponse>(`${this.uri}/create`, {
      facilityId,
      createdByUsername,
      name,
      sport,
      startDateTime,
    });
  }

  apply(id: string, athleteUsername: string) {
    return this.http.post<TournamentResponse>(`${this.uri}/apply`, {
      id,
      athleteUsername,
    });
  }

  resolve(id: string, employeeUsername: string, applicationId: string, status: string) {
    return this.http.post<TournamentResponse>(`${this.uri}/resolve`, {
      id,
      employeeUsername,
      applicationId,
      status,
    });
  }

  close(id: string, employeeUsername: string) {
    return this.http.post<TournamentResponse>(`${this.uri}/close`, {
      id,
      employeeUsername,
    });
  }
}
