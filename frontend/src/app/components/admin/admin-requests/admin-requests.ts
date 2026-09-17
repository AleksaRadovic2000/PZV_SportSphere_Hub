import { Component, inject } from '@angular/core';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-admin-requests',
  imports: [],
  templateUrl: './admin-requests.html',
})
export class AdminRequests {
  private userService = inject(UserService);
  user = this.userService.getLoggedUser();
}
