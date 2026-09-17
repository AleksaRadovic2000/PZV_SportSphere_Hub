import { Component, inject } from '@angular/core';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-athlete-profile',
  imports: [],
  templateUrl: './athlete-profile.html',
})
export class AthleteProfile {
  private userService = inject(UserService);
  user = this.userService.getLoggedUser();
}
