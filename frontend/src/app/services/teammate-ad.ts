import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { TeammateAd, TeammateAdResponse } from '../models/teammate-ad';

@Injectable({ providedIn: 'root' })
export class TeammateAdService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/teammate-ads`;

  getActive() {
    return this.http.get<TeammateAd[]>(`${this.uri}/active`);
  }

  getMine(username: string) {
    return this.http.get<TeammateAd[]>(`${this.uri}/mine/${username}`);
  }

  create(
    authorUsername: string,
    sport: string,
    city: string,
    startDateTime: Date,
    endDateTime: Date,
    playersNeeded: number,
  ) {
    return this.http.post<TeammateAdResponse>(`${this.uri}/create`, {
      authorUsername,
      sport,
      city,
      startDateTime,
      endDateTime,
      playersNeeded,
    });
  }

  join(id: string, athleteUsername: string) {
    return this.http.post<TeammateAdResponse>(`${this.uri}/join`, { id, athleteUsername });
  }

  resolve(id: string, authorUsername: string, requestId: string, status: string) {
    return this.http.post<TeammateAdResponse>(`${this.uri}/resolve`, {
      id,
      authorUsername,
      requestId,
      status,
    });
  }

  close(id: string, authorUsername: string) {
    return this.http.post<TeammateAdResponse>(`${this.uri}/close`, { id, authorUsername });
  }
}
