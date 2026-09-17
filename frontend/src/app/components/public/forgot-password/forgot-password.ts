import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private userService = inject(UserService);

  identifier = '';
  message = '';
  resetUrl = '';
  loading = false;

  requestResetLink() {
    this.message = '';
    this.resetUrl = '';

    if (!this.identifier.trim()) {
      this.message = 'Unesite korisnicko ime ili email.';
      return;
    }

    this.loading = true;
    this.userService.requestPasswordReset(this.identifier).subscribe({
      next: (response) => {
        this.message = response.message;
        this.resetUrl = response.resetUrl;
        this.loading = false;
      },
      error: (error) => {
        this.message = error.error?.message || 'Kreiranje linka nije uspelo.';
        this.loading = false;
      },
    });
  }
}
