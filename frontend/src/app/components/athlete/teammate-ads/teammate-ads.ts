import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeammateAd } from '../../../models/teammate-ad';
import { Sport } from '../../../models/sport';
import { SportService } from '../../../services/sport';
import { TeammateAdService } from '../../../services/teammate-ad';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-teammate-ads',
  imports: [FormsModule],
  templateUrl: './teammate-ads.html',
})
export class TeammateAds implements OnInit {
  private teammateAdService = inject(TeammateAdService);
  private sportService = inject(SportService);
  private userService = inject(UserService);

  sports: Sport[] = [];
  activeAds: TeammateAd[] = [];
  myAds: TeammateAd[] = [];
  sport = '';
  city = '';
  date = '';
  startTime = '';
  endTime = '';
  playersNeeded = 1;
  message = '';
  success = false;

  ngOnInit() {
    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: () => {
        this.message = 'Lista sportova nije dostupna.';
      },
    });
    this.loadAds();
  }

  loadAds() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.teammateAdService.getActive().subscribe({
      next: (ads) => {
        this.activeAds = ads;
      },
      error: (error) => {
        this.message = error.error?.message || 'Aktivne oglase nije moguce ucitati.';
        this.success = false;
      },
    });

    this.teammateAdService.getMine(user.username).subscribe({
      next: (ads) => {
        this.myAds = ads;
      },
      error: (error) => {
        this.message = error.error?.message || 'Sopstvene oglase nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  createAd() {
    this.message = '';
    this.success = false;
    const user = this.userService.getLoggedUser();

    if (!user || !this.sport || !this.city.trim() || !this.date || !this.startTime || !this.endTime) {
      this.message = 'Popunite sva polja oglasa.';
      return;
    }

    const startDateTime = new Date(`${this.date}T${this.startTime}:00`);
    const endDateTime = new Date(`${this.date}T${this.endTime}:00`);

    if (startDateTime <= new Date() || endDateTime <= startDateTime) {
      this.message = 'Termin oglasa nije ispravan.';
      return;
    }

    if (!Number.isInteger(this.playersNeeded) || this.playersNeeded < 1) {
      this.message = 'Broj igraca mora biti pozitivan ceo broj.';
      return;
    }

    this.teammateAdService
      .create(
        user.username,
        this.sport,
        this.city,
        startDateTime,
        endDateTime,
        this.playersNeeded,
      )
      .subscribe({
        next: (response) => {
          this.message = response.message;
          this.success = true;
          this.resetForm();
          this.loadAds();
        },
        error: (error) => {
          this.message = error.error?.message || 'Kreiranje oglasa nije uspelo.';
        },
      });
  }

  joinAd(ad: TeammateAd) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.teammateAdService.join(ad._id, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadAds();
      },
      error: (error) => {
        this.message = error.error?.message || 'Slanje zahteva nije uspelo.';
        this.success = false;
      },
    });
  }

  resolveRequest(ad: TeammateAd, requestId: string, status: string) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.teammateAdService.resolve(ad._id, user.username, requestId, status).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadAds();
      },
      error: (error) => {
        this.message = error.error?.message || 'Obrada zahteva nije uspela.';
        this.success = false;
      },
    });
  }

  closeAd(ad: TeammateAd) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.teammateAdService.close(ad._id, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadAds();
      },
      error: (error) => {
        this.message = error.error?.message || 'Zatvaranje oglasa nije uspelo.';
        this.success = false;
      },
    });
  }

  isMyAd(ad: TeammateAd) {
    return ad.authorUsername === this.userService.getLoggedUser()?.username;
  }

  getMyRequestStatus(ad: TeammateAd) {
    const username = this.userService.getLoggedUser()?.username;
    return ad.requests.find((request) => request.athleteUsername === username)?.status || '';
  }

  formatDateTime(value: string) {
    return new Date(value).toLocaleString('sr-Latn-RS');
  }

  private resetForm() {
    this.sport = '';
    this.city = '';
    this.date = '';
    this.startTime = '';
    this.endTime = '';
    this.playersNeeded = 1;
  }
}
