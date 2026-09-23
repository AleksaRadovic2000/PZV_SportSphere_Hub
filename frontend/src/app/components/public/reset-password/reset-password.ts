import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);

  newPassword = '';
  passwordConfirmation = '';
  message = '';
  success = false;
  loading = false;

  validatePassword() {
    return /^(?=[A-Za-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(this.newPassword);
  }

  resetPassword() {
    this.message = '';
    this.success = false;

    if (!this.validatePassword()) {
      this.message =
        'Lozinka mora imati 8-12 karaktera, poceti slovom i sadrzati veliko slovo, broj i specijalni karakter.';
      return;
    }

    if (this.newPassword !== this.passwordConfirmation) {
      this.message = 'Lozinke se ne poklapaju.';
      return;
    }

    const token = this.route.snapshot.paramMap.get('token') || '';
    this.loading = true;
    this.userService.resetPassword(token, this.newPassword).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loading = false;
      },
      error: (error) => {
        this.message = error.error?.message || 'Promena lozinke nije uspela.';
        this.loading = false;
      },
    });
  }
}
