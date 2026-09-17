import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user';
import { UserService } from '../../../services/user';
import { SportSelector } from '../../shared/sport-selector/sport-selector';

@Component({
  selector: 'app-athlete-profile',
  imports: [FormsModule, SportSelector],
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
  }

  onProfileImageSelected(event: Event) {
    let input = event.target as HTMLInputElement;
    let file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.message = 'Profilna slika mora biti PNG ili JPG fajl.';
      input.value = '';
      return;
    }

    this.profileImage = file;
    let reader = new FileReader();
    reader.onload = () => {
      this.profileImagePreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
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
