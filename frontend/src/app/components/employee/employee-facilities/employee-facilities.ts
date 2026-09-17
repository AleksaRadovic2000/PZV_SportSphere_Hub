import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Facility } from '../../../models/facility';
import { FacilityService } from '../../../services/facility';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-employee-facilities',
  imports: [RouterLink],
  templateUrl: './employee-facilities.html',
})
export class EmployeeFacilities implements OnInit {
  private facilityService = inject(FacilityService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  selectedFile: File | null = null;
  message = '';
  success = false;

  ngOnInit() {
    this.loadFacilities();
  }

  loadFacilities() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities;
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  selectJsonFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  importFacility() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.selectedFile) {
      this.message = 'Izaberite JSON fajl.';
      this.success = false;
      return;
    }

    this.facilityService.importFacility(this.selectedFile, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.selectedFile = null;
        this.loadFacilities();
      },
      error: (error) => {
        this.message = error.error?.message || 'Uvoz objekta nije uspeo.';
        this.success = false;
      },
    });
  }

  getSports(facility: Facility) {
    const sports = new Set<string>();

    facility.resources.forEach((resource) => {
      resource.sportPrices.forEach((price) => sports.add(price.sport));
    });

    return [...sports].join(', ');
  }
}
