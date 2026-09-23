import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Facility } from '../../../models/facility';
import { Sport } from '../../../models/sport';
import { FacilityService } from '../../../services/facility';
import { SportService } from '../../../services/sport';
import { getFacilitySports } from '../../../shared/facility-utils';

@Component({
  selector: 'app-athlete-facility-search',
  imports: [FormsModule, RouterLink],
  templateUrl: './athlete-facility-search.html',
})
export class AthleteFacilitySearch implements OnInit {
  getSports = getFacilitySports;
  private facilityService = inject(FacilityService);
  private sportService = inject(SportService);

  sports: Sport[] = [];
  cities: string[] = [];
  facilities: Facility[] = [];
  searchResults: Facility[] = [];
  searchName = '';
  selectedCities: string[] = [];
  selectedSport = '';
  resourceType = '';
  onlyAvailableToday = false;
  sortColumn = '';
  sortDirection = 'asc';
  message = '';

  ngOnInit() {
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
    this.message = '';
    this.facilityService
      .search(
        this.searchName,
        this.selectedCities,
        this.selectedSport,
        this.resourceType,
        this.onlyAvailableToday
      )
      .subscribe({
        next: (facilities) => {
          this.searchResults = facilities;
          this.facilities = [...facilities];
          this.sortColumn = '';
          this.sortDirection = 'asc';
        },
        error: (error) => {
          this.message = error.error?.message || 'Pretraga objekata nije uspela.';
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
      return (
        this.getSortValue(first, column).localeCompare(this.getSortValue(second, column)) *
        direction
      );
    });
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
