import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { Sport } from '../../../models/sport';
import { Tournament } from '../../../models/tournament';
import { FacilityService } from '../../../services/facility';
import { SportService } from '../../../services/sport';
import { TournamentService } from '../../../services/tournament';
import { UserService } from '../../../services/user';

import { getSerbianLabel } from '../../../shared/serbian-label';

@Component({
  selector: 'app-employee-tournaments',
  imports: [FormsModule],
  templateUrl: './employee-tournaments.html',
})
export class EmployeeTournaments implements OnInit {
  label = getSerbianLabel;
  private facilityService = inject(FacilityService);
  private sportService = inject(SportService);
  private tournamentService = inject(TournamentService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  sports: Sport[] = [];
  tournaments: Tournament[] = [];
  facilityId = '';
  name = '';
  sport = '';
  date = '';
  time = '';
  message = '';
  success = false;

  ngOnInit() {
    this.loadFacilities();
    this.loadSports();
    this.loadTournaments();
  }

  loadFacilities() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities.filter((facility) => facility.status === 'active');
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  loadSports() {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: () => {
        this.message = 'Listu sportova nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  loadTournaments() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.tournamentService.getForEmployee(user.username).subscribe({
      next: (tournaments) => {
        this.tournaments = tournaments;
      },
      error: (error) => {
        this.message = error.error?.message || 'Turnire nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  createTournament() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId || !this.name.trim() || !this.sport || !this.date || !this.time) {
      this.message = 'Popunite sva polja turnira.';
      this.success = false;
      return;
    }

    const startDateTime = new Date(`${this.date}T${this.time}:00`);

    if (startDateTime <= new Date()) {
      this.message = 'Pocetak turnira mora biti u buducnosti.';
      this.success = false;
      return;
    }

    this.tournamentService
      .create(this.facilityId, user.username, this.name, this.sport, startDateTime)
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.success = true;
          this.resetForm();
          this.loadTournaments();
        },
        error: (error) => {
          this.message = error.error?.message || 'Kreiranje turnira nije uspelo.';
          this.success = false;
        },
      });
  }

  resolveApplication(tournament: Tournament, applicationId: string, status: string) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.tournamentService.resolve(tournament._id, user.username, applicationId, status).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadTournaments();
      },
      error: (error) => {
        this.message = error.error?.message || 'Obrada prijave nije uspela.';
        this.success = false;
      },
    });
  }

  closeTournament(tournament: Tournament) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.tournamentService.close(tournament._id, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadTournaments();
      },
      error: (error) => {
        this.message = error.error?.message || 'Zatvaranje turnira nije uspelo.';
        this.success = false;
      },
    });
  }

  formatDateTime(value: string) {
    return new Date(value).toLocaleString('sr-Latn-RS');
  }

  private resetForm() {
    this.facilityId = '';
    this.name = '';
    this.sport = '';
    this.date = '';
    this.time = '';
  }
}
