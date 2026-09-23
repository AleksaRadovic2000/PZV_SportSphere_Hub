import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { Sport } from '../../../models/sport';
import { FacilityService } from '../../../services/facility';
import { SportService } from '../../../services/sport';
import { UserService } from '../../../services/user';
import { EmployeeOrders } from './employee-orders/employee-orders';
import { EmployeeProducts } from './employee-products/employee-products';
import { EmployeePromotions } from './employee-promotions/employee-promotions';

@Component({
  selector: 'app-employee-catalog',
  imports: [FormsModule, EmployeePromotions, EmployeeProducts, EmployeeOrders],
  templateUrl: './employee-catalog.html',
})
export class EmployeeCatalog implements OnInit {
  private facilityService = inject(FacilityService);
  private sportService = inject(SportService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  sports: Sport[] = [];
  facilityId = '';
  productsRefresh = 0;
  message = '';

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities.filter((facility) => facility.status === 'active');
        this.facilityId = this.facilities[0]?._id || '';
      },
      error: (error) => {
        this.message = error.error?.message || 'Objekte nije moguce ucitati.';
      },
    });

    this.sportService.getAllSports().subscribe({
      next: (sports) => {
        this.sports = sports;
      },
      error: () => {
        this.message = 'Sportove nije moguce ucitati.';
      },
    });
  }

  get selectedFacility() {
    return this.facilities.find((facility) => facility._id === this.facilityId);
  }

  refreshProducts() {
    this.productsRefresh++;
  }
}
