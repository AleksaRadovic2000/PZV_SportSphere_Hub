import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class Health {
  private http = inject(HttpClient);

  check() {
    return this.http.get<{ message: string }>(environment.apiUrl);
  }
}
