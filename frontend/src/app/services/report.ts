import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/reports`;

  getOccupancyReport(facilityId: string, employeeUsername: string, month: string) {
    const params = new HttpParams()
      .set('facilityId', facilityId)
      .set('employeeUsername', employeeUsername)
      .set('month', month);
    return this.http.get(`${this.uri}/occupancy`, { params, responseType: 'blob' });
  }

  getSalesReport(facilityId: string, employeeUsername: string, month: string) {
    const params = new HttpParams()
      .set('facilityId', facilityId)
      .set('employeeUsername', employeeUsername)
      .set('month', month);
    return this.http.get(`${this.uri}/sales`, { params, responseType: 'blob' });
  }
}
