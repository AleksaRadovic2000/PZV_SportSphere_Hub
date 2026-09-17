import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
})
export class Header {
  private userService = inject(UserService);
  private router = inject(Router);

  get loggedUser() {
    return this.userService.getLoggedUser();
  }

  get homeRoute() {
    const user = this.loggedUser;
    return user ? this.userService.getHomeRoute(user) : '/';
  }

  logout() {
    this.userService.logout();
    this.router.navigateByUrl('/');
  }
}
