import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CurrentPromotion, Facility, PublicFacilityInfo } from '../../../models/facility';
import { Sport } from '../../../models/sport';
import { FacilityService } from '../../../services/facility';
import { SportService } from '../../../services/sport';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private userService = inject(UserService);
  private facilityService = inject(FacilityService);
  private sportService = inject(SportService);
  private router = inject(Router);

  username = '';
  password = '';
  message = '';
  loading = false;
  publicInfo = new PublicFacilityInfo();
  promotions: CurrentPromotion[] = [];
  sports: Sport[] = [];
  cities: string[] = [];
  facilities: Facility[] = [];
  searchResults: Facility[] = [];
  searchName = '';
  selectedCities: string[] = [];
  selectedSport = '';
  resourceType = '';
  publicMessage = '';
  sortColumn = '';
  sortDirection = 'asc';

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (user) {
      this.router.navigateByUrl(this.userService.getHomeRoute(user));
      return;
    }

    this.loadPublicContent();
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

  loadPublicContent() {
    this.facilityService.getPublicInfo().subscribe({
      next: (publicInfo) => {
        this.publicInfo = publicInfo;
      },
      error: () => {
        this.publicMessage = 'Javne informacije trenutno nisu dostupne.';
      },
    });

    this.facilityService.getCurrentPromotions().subscribe({
      next: (promotions) => {
        this.promotions = promotions;
      },
    });

    this.facilityService.getCities().subscribe({
      next: (cities) => {
        this.cities = cities;
      },
    });

    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
    });

    this.searchFacilities();
  }

  searchFacilities() {
    this.facilityService
      .search(this.searchName, this.selectedCities, this.selectedSport, this.resourceType)
      .subscribe({
        next: (facilities) => {
          this.searchResults = facilities;
          this.facilities = [...facilities];
          this.sortColumn = '';
          this.sortDirection = 'asc';
        },
        error: (error) => {
          this.publicMessage = error.error?.message || 'Pretraga objekata nije uspela.';
        },
      });
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const direction = this.sortDirection === 'asc' ? 1 : -1;

    this.facilities = [...this.searchResults].sort((first, second) => {
      const firstValue = this.getSortValue(first, column);
      const secondValue = this.getSortValue(second, column);
      return firstValue.localeCompare(secondValue) * direction;
    });
  }

  getSports(facility: Facility) {
    const sports = new Set<string>();

    facility.resources.forEach((resource) => {
      resource.sportPrices.forEach((price) => sports.add(price.sport));
    });

    return [...sports].sort().join(', ');
  }

  formatPromotionDiscount(promotion: CurrentPromotion) {
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}%`;
    }

    return `${promotion.discountValue} RSD`;
  }

  private getSortValue(facility: Facility, column: string) {
    if (column === 'city') {
      return facility.city;
    }

    if (column === 'sport') {
      return this.getSports(facility);
    }

    return facility.name;
  }
}
