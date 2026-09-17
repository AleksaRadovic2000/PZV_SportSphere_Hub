import { Component, inject } from '@angular/core';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-employee-profile',
  imports: [],
  templateUrl: './employee-profile.html',
})
export class EmployeeProfile {
  private userService = inject(UserService);
  user = this.userService.getLoggedUser();
}
