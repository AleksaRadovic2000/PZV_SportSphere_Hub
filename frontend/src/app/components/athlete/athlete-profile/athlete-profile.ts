import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user';
import { UserService } from '../../../services/user';
import { ProfileImageSelector } from '../../shared/profile-image-selector/profile-image-selector';
import { SportSelector } from '../../shared/sport-selector/sport-selector';
import { AthleteOrders } from './athlete-orders/athlete-orders';
import { AthleteProfileReservations } from './athlete-profile-reservations/athlete-profile-reservations';
import { AthleteProfileTrainings } from './athlete-profile-trainings/athlete-profile-trainings';

@Component({
  selector: 'app-athlete-profile',
  imports: [
    FormsModule,
    SportSelector,
    ProfileImageSelector,
    AthleteOrders,
    AthleteProfileReservations,
    AthleteProfileTrainings,
  ],
  templateUrl: './athlete-profile.html',
})
export class AthleteProfile implements OnInit {
  private userService = inject(UserService);
  user = new User();
  profileImage: File | null = null;
  profileImagePreview = '';
  message = '';
  success = false;
  loading = false;

  ngOnInit() {
    const loggedUser = this.userService.getLoggedUser();
    if (!loggedUser) return;
    this.userService.getProfile(loggedUser.username).subscribe({
      next: (user) => {
        this.user = user;
        this.profileImagePreview = this.userService.getProfileImageUrl(user.profileImage);
      },
      error: (error) => (this.message = error.error?.message || 'Profil nije moguce ucitati.'),
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
    if (this.user.favouriteSports.length > 5) {
      this.message = 'Mozete izabrati najvise pet sportova.';
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
