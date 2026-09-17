import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule],
  templateUrl: './admin-login.html',
})
export class AdminLogin {
  private userService = inject(UserService);
  private router = inject(Router);

  username = '';
  password = '';
  message = '';
  loading = false;

  loginAdmin() {
    this.message = '';

    if (!this.username.trim() || !this.password) {
      this.message = 'Unesite korisnicko ime i lozinku.';
      return;
    }

    this.loading = true;
    this.userService.adminLogin(this.username, this.password).subscribe({
      next: (response) => {
        this.userService.saveLoggedUser(response.user);
        this.router.navigateByUrl('/admin/requests');
      },
      error: (error) => {
        this.message = error.error?.message || 'Prijava nije uspela.';
        this.loading = false;
      },
    });
  }
}
