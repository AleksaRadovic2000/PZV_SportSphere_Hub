import { Component, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FacilityDetailsResponse } from '../../../models/facility';
import { FacilityService } from '../../../services/facility';
import { UserService } from '../../../services/user';
import { getSerbianLabel } from '../../../shared/serbian-label';
import { FacilityReservation } from './facility-reservation/facility-reservation';
import { FacilityReviews } from './facility-reviews/facility-reviews';

@Component({
  selector: 'app-facility-details',
  imports: [RouterLink, FacilityReservation, FacilityReviews],
  templateUrl: './facility-details.html',
})
export class FacilityDetails implements OnInit {
  label = getSerbianLabel;
  private facilityService = inject(FacilityService);
  private userService = inject(UserService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  details = new FacilityDetailsResponse();
  mapUrl: SafeResourceUrl | null = null;
  message = '';
  loaded = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.message = 'Objekat nije izabran.';
      return;
    }
    this.facilityService.getDetails(id).subscribe({
      next: (details) => {
        this.details = details;
        this.loaded = true;

        if (this.loggedAthlete) {
          this.initializeMap();
        }
      },
      error: (error) =>
        (this.message = error.error?.message || 'Detalje objekta nije moguce ucitati.'),
    });
  }

  get loggedAthlete() {
    const user = this.userService.getLoggedUser();
    return user?.role === 'athlete' ? user : null;
  }

  get backRoute() {
    return this.loggedAthlete ? '/athlete/facilities' : '/';
  }

  getImageUrl(image: string) {
    return this.facilityService.getImageUrl(image);
  }

  getDayName(day: number) {
    const dayNames = [
      '',
      'Ponedeljak',
      'Utorak',
      'Sreda',
      'Cetvrtak',
      'Petak',
      'Subota',
      'Nedelja',
    ];
    return dayNames[day] || '';
  }

  private initializeMap() {
    const latitude = this.details.facility.location.latitude;
    const longitude = this.details.facility.location.longitude;
    const distance = 0.01;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - distance},${
      latitude - distance
    },${longitude + distance},${latitude + distance}&layer=mapnik&marker=${latitude},${longitude}`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
