import { Component, inject, OnInit } from '@angular/core';
import { Facility } from '../../../models/facility';
import { User } from '../../../models/user';
import { FacilityService } from '../../../services/facility';
import { UserService } from '../../../services/user';

import { getSerbianLabel } from '../../../shared/serbian-label';

@Component({
  selector: 'app-admin-requests',
  imports: [],
  templateUrl: './admin-requests.html',
})
export class AdminRequests implements OnInit {
  label = getSerbianLabel;
  private userService = inject(UserService);
  private facilityService = inject(FacilityService);

  users: User[] = [];
  facilities: Facility[] = [];
  message = '';
  success = false;

  ngOnInit() {
    this.loadPendingUsers();
    this.loadPendingFacilities();
  }

  loadPendingUsers() {
    this.userService.getPendingUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        this.message = error.error?.message || 'Zahteve nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  approveUser(username: string) {
    this.userService.approveUser(username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadPendingUsers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Odobravanje zahteva nije uspelo.';
        this.success = false;
      },
    });
  }

  rejectUser(username: string) {
    this.userService.rejectUser(username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadPendingUsers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Odbijanje zahteva nije uspelo.';
        this.success = false;
      },
    });
  }

  loadPendingFacilities() {
    this.facilityService.getPending().subscribe({
      next: (facilities) => {
        this.facilities = facilities;
      },
      error: (error) => {
        this.message = error.error?.message || 'Zahteve za objekte nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  approveFacility(id: string) {
    this.facilityService.approve(id).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadPendingFacilities();
      },
      error: (error) => {
        this.message = error.error?.message || 'Odobravanje objekta nije uspelo.';
        this.success = false;
      },
    });
  }

  rejectFacility(id: string) {
    this.facilityService.reject(id).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadPendingFacilities();
      },
      error: (error) => {
        this.message = error.error?.message || 'Odbijanje objekta nije uspelo.';
        this.success = false;
      },
    });
  }
}
