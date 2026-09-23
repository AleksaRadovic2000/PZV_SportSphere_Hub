import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Facility } from '../../../models/facility';
import { User } from '../../../models/user';
import { FacilityService } from '../../../services/facility';
import { UserService } from '../../../services/user';
import { ProfileImageSelector } from '../../shared/profile-image-selector/profile-image-selector';

import { getSerbianLabel } from '../../../shared/serbian-label';
import { getFacilityResources, getFacilitySports } from '../../../shared/facility-utils';

@Component({
  selector: 'app-employee-profile',
  imports: [FormsModule, RouterLink, ProfileImageSelector],
  templateUrl: './employee-profile.html',
})
export class EmployeeProfile implements OnInit {
  label = getSerbianLabel;
  getSports = getFacilitySports;
  getResources = getFacilityResources;
  private userService = inject(UserService);
  private facilityService = inject(FacilityService);

  user = new User();
  facilities: Facility[] = [];
  profileImage: File | null = null;
  profileImagePreview = '';
  message = '';
  success = false;
  loading = false;

  ngOnInit() {
    let loggedUser = this.userService.getLoggedUser();

    if (!loggedUser) {
      return;
    }

    this.userService.getProfile(loggedUser.username).subscribe({
      next: (user) => {
        this.user = user;
        this.profileImagePreview = this.userService.getProfileImageUrl(user.profileImage);
      },
      error: (error) => {
        this.message = error.error?.message || 'Profil nije moguce ucitati.';
      },
    });

    this.facilityService.getEmployeeFacilities(loggedUser.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities;
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
      },
    });
  }

  onProfileImageSelected(file: File | null) {
    this.profileImage = file;
    this.message = '';
  }

  onProfileImagePreviewSelected(preview: string) {
    this.profileImagePreview = preview;
  }

  updateProfile() {
    this.message = '';
    this.success = false;

    if (
      !this.user.firstName.trim() ||
      !this.user.lastName.trim() ||
      !this.user.phone.trim() ||
      !this.user.email.trim()
    ) {
      this.message = 'Popunite sva obavezna polja.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.user.email)) {
      this.message = 'Email adresa nije ispravna.';
      return;
    }

    this.loading = true;
    this.userService.updateProfile(this.user, this.profileImage).subscribe({
      next: (response) => {
        this.user = response.user;
        this.userService.saveLoggedUser(response.user);
        this.profileImagePreview = this.userService.getProfileImageUrl(response.user.profileImage);
        this.profileImage = null;
        this.message = response.message;
        this.success = true;
        this.loading = false;
      },
      error: (error) => {
        this.message = error.error?.message || 'Izmena profila nije uspela.';
        this.loading = false;
      },
    });
  }
}
