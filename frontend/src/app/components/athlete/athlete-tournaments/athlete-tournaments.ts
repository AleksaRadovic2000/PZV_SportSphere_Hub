import { Component, inject, OnInit } from '@angular/core';
import { Tournament } from '../../../models/tournament';
import { TournamentService } from '../../../services/tournament';
import { UserService } from '../../../services/user';

import { getSerbianLabel } from '../../../shared/serbian-label';
import { formatDateTime } from '../../../shared/date-utils';

@Component({
  selector: 'app-athlete-tournaments',
  imports: [],
  templateUrl: './athlete-tournaments.html',
})
export class AthleteTournaments implements OnInit {
  label = getSerbianLabel;
  formatDateTime = formatDateTime;
  private tournamentService = inject(TournamentService);
  private userService = inject(UserService);

  openTournaments: Tournament[] = [];
  myTournaments: Tournament[] = [];
  message = '';
  success = false;

  ngOnInit() {
    this.loadTournaments();
  }

  loadTournaments() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.tournamentService.getOpen().subscribe({
      next: (tournaments) => {
        this.openTournaments = tournaments;
      },
      error: (error) => {
        this.message = error.error?.message || 'Otvorene turnire nije moguce ucitati.';
        this.success = false;
      },
    });

    this.tournamentService.getForAthlete(user.username).subscribe({
      next: (tournaments) => {
        this.myTournaments = tournaments;
      },
      error: (error) => {
        this.message = error.error?.message || 'Sopstvene prijave nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  apply(tournament: Tournament) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.tournamentService.apply(tournament._id, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadTournaments();
      },
      error: (error) => {
        this.message = error.error?.message || 'Slanje prijave nije uspelo.';
        this.success = false;
      },
    });
  }

  getMyApplicationStatus(tournament: Tournament) {
    const username = this.userService.getLoggedUser()?.username;
    return (
      tournament.applications.find((application) => application.athleteUsername === username)
        ?.status || ''
    );
  }
}
