import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import {
  AthleteReservation,
  AthleteStatistics,
  EmployeeReservation,
  Reservation,
  ReservationResponse,
} from '../models/reservation';
import { Message } from '../models/user';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/reservations`;

  getSchedule(resourceId: string, rangeStart: Date, rangeEnd: Date) {
    return this.http.post<Reservation[]>(`${this.uri}/schedule`, {
      resourceId,
      rangeStart,
      rangeEnd,
    });
  }

  createReservation(
    athleteUsername: string,
    facilityId: string,
    resourceId: string,
    sport: string,
    startDateTime: Date,
    endDateTime: Date,
  ) {
    return this.http.post<ReservationResponse>(`${this.uri}/create`, {
      athleteUsername,
      facilityId,
      resourceId,
      sport,
      startDateTime,
      endDateTime,
    });
  }

  getAthleteReservations(username: string) {
    return this.http.get<AthleteReservation[]>(`${this.uri}/athlete/${username}`);
  }

  getStatistics(username: string) {
    return this.http.get<AthleteStatistics>(`${this.uri}/statistics/${username}`);
  }

  cancelReservation(id: string, athleteUsername: string) {
    return this.http.post<Message>(`${this.uri}/cancel`, { id, athleteUsername });
  }

  getFacilityReservations(facilityId: string, employeeUsername: string) {
    const params = { employeeUsername };
    return this.http.get<EmployeeReservation[]>(`${this.uri}/facility/${facilityId}`, { params });
  }

  markAttendance(id: string, employeeUsername: string, attended: boolean) {
    return this.http.post<ReservationResponse>(`${this.uri}/attendance`, {
      id,
      employeeUsername,
      attended,
    });
  }

  moveReservation(
    id: string,
    employeeUsername: string,
    startDateTime: Date,
    endDateTime: Date,
  ) {
    return this.http.post<ReservationResponse>(`${this.uri}/move`, {
      id,
      employeeUsername,
      startDateTime,
      endDateTime,
    });
  }
}
