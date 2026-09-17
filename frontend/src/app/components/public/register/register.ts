import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RegisterUser } from '../../../models/user';
import { Sport } from '../../../models/sport';
import { SportService } from '../../../services/sport';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register implements OnInit {
  private userService = inject(UserService);
  private sportService = inject(SportService);

  user = new RegisterUser();

  sports: Sport[] = [];
  passwordConfirmation = '';
  profileImage: File | null = null;
  profileImagePreview = '';
  generatedAvatar: File | null = null;
  generatedAvatarPreview = '';
  message = '';
  success = false;
  loading = false;

  ngOnInit() {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: () => {
        this.message = 'Lista sportova nije dostupna.';
      },
    });
  }

  validatePassword() {
    return /^(?=[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(
      this.user.password,
    );
  }

  validatePasswordConfirmation() {
    return this.user.password === this.passwordConfirmation;
  }

  onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.message = 'Profilna slika mora biti PNG ili JPG fajl.';
      input.value = '';
      return;
    }

    this.profileImage = file;
    this.generatedAvatar = null;
    this.generatedAvatarPreview = '';
    this.readImagePreview(file);
  }

  generateAvatar() {
    const seed =
      `${this.user.firstName} ${this.user.lastName}`.trim() || this.user.username.trim() || 'User';
    this.message = '';
    this.userService.generateAvatar(seed).subscribe({
      next: (avatar) => {
        this.generatedAvatar = new File([avatar], 'generated-avatar.png', { type: 'image/png' });

        const reader = new FileReader();
        reader.onload = () => {
          this.generatedAvatarPreview = String(reader.result || '');
        };
        reader.readAsDataURL(this.generatedAvatar);
      },
      error: (error) => {
        this.message = error.error?.message || 'Avatar nije moguce generisati.';
      },
    });
  }

  saveGeneratedAvatar() {
    if (!this.generatedAvatar) {
      this.message = 'Prvo generisite avatar.';
      return;
    }

    this.profileImage = this.generatedAvatar;
    this.profileImagePreview = this.generatedAvatarPreview;
    this.message = 'Avatar je sacuvan kao profilna slika.';
  }

  register() {
    this.message = '';
    this.success = false;

    const validationMessage = this.validateForm();

    if (validationMessage) {
      this.message = validationMessage;
      return;
    }

    this.loading = true;
    this.userService.register(this.user, this.profileImage).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loading = false;
      },
      error: (error) => {
        this.message = error.error?.message || 'Registracija nije uspela.';
        this.loading = false;
      },
    });
  }

  private validateForm() {
    const requiredValues = [
      this.user.username,
      this.user.firstName,
      this.user.lastName,
      this.user.phone,
      this.user.email,
    ];

    if (requiredValues.some((value) => !value.trim())) {
      return 'Popunite sva obavezna polja.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.user.email)) {
      return 'Email adresa nije ispravna.';
    }

    if (!this.validatePassword()) {
      return 'Lozinka mora imati 8-12 karaktera, poceti slovom i sadrzati veliko slovo, broj i specijalni karakter.';
    }

    if (!this.validatePasswordConfirmation()) {
      return 'Lozinke se ne poklapaju.';
    }

    if (this.user.favouriteSports.length > 5) {
      return 'Mozete izabrati najvise pet sportova.';
    }

    if (this.user.role === 'employee') {
      const companyValues = [
        this.user.companyName,
        this.user.companyAddress,
        this.user.registrationNumber,
        this.user.taxId,
      ];

      if (companyValues.some((value) => !value?.trim())) {
        return 'Popunite sva polja sportskog objekta.';
      }

      if (!/^\d{8}$/.test(this.user.registrationNumber)) {
        return 'Maticni broj mora imati tacno 8 cifara.';
      }

      if (!/^[1-9]\d{8}$/.test(this.user.taxId)) {
        return 'PIB mora imati tacno 9 cifara i ne sme pocinjati nulom.';
      }
    }

    return '';
  }

  private readImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      this.profileImagePreview = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }
}
