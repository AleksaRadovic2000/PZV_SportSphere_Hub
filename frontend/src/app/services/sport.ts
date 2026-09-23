import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { Sport } from '../models/sport';
import { Message } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class SportService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/sports`;

  getAllSports() {
    return this.http.get<Sport[]>(`${this.uri}/all`);
  }

  addSport(name: string) {
    return this.http.post<Message>(`${this.uri}/add`, { name });
  }
}
