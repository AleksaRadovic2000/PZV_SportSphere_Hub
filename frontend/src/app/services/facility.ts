import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import {
  CurrentPromotion,
  Facility,
  FacilityDetailsResponse,
  FacilityResponse,
  PublicFacilityInfo,
} from '../models/facility';
import { Message } from '../models/user';

@Injectable({ providedIn: 'root' })
export class FacilityService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/facilities`;

  getEmployeeFacilities(username: string) {
    return this.http.get<Facility[]>(`${this.uri}/employee/${username}`);
  }

  getManagedDetails(id: string, username: string) {
    return this.http.get<Facility>(`${this.uri}/managed/${id}/${username}`);
  }

  create(facility: Facility, username: string, images: File[]) {
    const formData = this.createFormData(facility, username, images);
    return this.http.post<FacilityResponse>(`${this.uri}/create`, formData);
  }

  update(facility: Facility, username: string, images: File[]) {
    const formData = this.createFormData(facility, username, images);
    return this.http.post<FacilityResponse>(`${this.uri}/update`, formData);
  }

  importFacility(file: File, username: string) {
    const formData = new FormData();
    formData.append('facilityFile', file);
    formData.append('username', username);
    return this.http.post<FacilityResponse>(`${this.uri}/import`, formData);
  }

  getPending() {
    return this.http.get<Facility[]>(`${this.uri}/pending`);
  }

  approve(id: string) {
    return this.http.post<Message>(`${this.uri}/approve`, { id });
  }

  reject(id: string) {
    return this.http.post<Message>(`${this.uri}/reject`, { id });
  }

  getPublicInfo() {
    return this.http.get<PublicFacilityInfo>(`${this.uri}/public-info`);
  }

  getCities() {
    return this.http.get<string[]>(`${this.uri}/cities`);
  }

  search(
    name: string,
    cities: string[],
    sport: string,
    resourceType: string,
    onlyAvailableToday = false,
  ) {
    return this.http.post<Facility[]>(`${this.uri}/search`, {
      name,
      cities,
      sport,
      resourceType,
      onlyAvailableToday,
    });
  }

  getDetails(id: string) {
    return this.http.get<FacilityDetailsResponse>(`${this.uri}/details/${id}`);
  }

  getCurrentPromotions() {
    return this.http.get<CurrentPromotion[]>(`${this.uri}/promotions/current`);
  }

  getImageUrl(image: string) {
    return `${environment.apiUrl}/${image}`;
  }

  private createFormData(facility: Facility, username: string, images: File[]) {
    const formData = new FormData();
    formData.append('facility', JSON.stringify(facility));
    formData.append('username', username);
    images.forEach((image) => formData.append('images', image));
    return formData;
  }
}
