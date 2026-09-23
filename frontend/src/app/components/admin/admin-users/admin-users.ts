import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../models/user';
import { UserService } from '../../../services/user';

import { getSerbianLabel } from '../../../shared/serbian-label';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule],
  templateUrl: './admin-users.html',
})
export class AdminUsers implements OnInit {
  label = getSerbianLabel;
  private userService = inject(UserService);

  users: User[] = [];
  selectedUser: User | null = null;
  message = '';
  success = false;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        this.message = error.error?.message || 'Korisnike nije moguce ucitati.';
      },
    });
  }

  selectUser(user: User) {
    this.selectedUser = new User();
    this.selectedUser._id = user._id;
    this.selectedUser.username = user.username;
    this.selectedUser.firstName = user.firstName;
    this.selectedUser.lastName = user.lastName;
    this.selectedUser.phone = user.phone;
    this.selectedUser.email = user.email;
    this.selectedUser.role = user.role;
    this.selectedUser.status = user.status;
    this.message = '';
    this.success = false;
  }

  updateUser() {
    if (!this.selectedUser) {
      return;
    }

    this.message = '';
    this.success = false;

    if (
      !this.selectedUser.firstName.trim() ||
      !this.selectedUser.lastName.trim() ||
      !this.selectedUser.phone.trim() ||
      !this.selectedUser.email.trim()
    ) {
      this.message = 'Popunite sva obavezna polja.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.selectedUser.email)) {
      this.message = 'Email adresa nije ispravna.';
      return;
    }

    this.userService.adminUpdateUser(this.selectedUser).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.selectedUser = null;
        this.loadUsers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Izmena korisnika nije uspela.';
      },
    });
  }

  deleteUser() {
    if (!this.selectedUser) {
      return;
    }

    let confirmed = confirm(`Obrisati korisnika ${this.selectedUser.username}?`);

    if (!confirmed) {
      return;
    }

    this.message = '';
    this.success = false;

    this.userService.deleteUser(this.selectedUser.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.selectedUser = null;
        this.loadUsers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Brisanje korisnika nije uspelo.';
      },
    });
  }
}
