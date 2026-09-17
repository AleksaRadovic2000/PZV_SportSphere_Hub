import { Component, inject, OnInit } from '@angular/core';
import { User } from '../../../models/user';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-admin-requests',
  imports: [],
  templateUrl: './admin-requests.html',
})
export class AdminRequests implements OnInit {
  private userService = inject(UserService);

  users: User[] = [];
  message = '';
  success = false;

  ngOnInit() {
    this.loadPendingUsers();
  }

  loadPendingUsers() {
    this.userService.getPendingUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        this.message = error.error?.message || 'Zahteve nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  approveUser(username: string) {
    this.userService.approveUser(username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadPendingUsers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Odobravanje zahteva nije uspelo.';
        this.success = false;
      },
    });
  }

  rejectUser(username: string) {
    this.userService.rejectUser(username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadPendingUsers();
      },
      error: (error) => {
        this.message = error.error?.message || 'Odbijanje zahteva nije uspelo.';
        this.success = false;
      },
    });
  }
}
