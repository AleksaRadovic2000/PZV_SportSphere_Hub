import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);

  username = '';
  password = '';
  message = '';
  loading = false;

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (user) {
      this.router.navigateByUrl(this.userService.getHomeRoute(user));
    }
  }

  login() {
    this.message = '';

    if (!this.username.trim() || !this.password) {
      this.message = 'Unesite korisnicko ime i lozinku.';
      return;
    }

    this.loading = true;
    this.userService.login(this.username, this.password).subscribe({
      next: (response) => {
        this.userService.saveLoggedUser(response.user);
        this.router.navigateByUrl(this.userService.getHomeRoute(response.user));
      },
      error: (error) => {
        this.message = error.error?.message || 'Prijava nije uspela.';
        this.loading = false;
      },
    });
  }
}
