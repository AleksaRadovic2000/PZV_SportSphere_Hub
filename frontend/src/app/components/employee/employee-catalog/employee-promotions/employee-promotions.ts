import { Component, inject, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility, Promotion } from '../../../../models/facility';
import { Sport } from '../../../../models/sport';
import { FacilityService } from '../../../../services/facility';
import { UserService } from '../../../../services/user';

@Component({
  selector: 'app-employee-promotions',
  imports: [FormsModule],
  templateUrl: './employee-promotions.html',
})
export class EmployeePromotions implements OnChanges {
  @Input() facility = new Facility();
  @Input() sports: Sport[] = [];
  private facilityService = inject(FacilityService);
  private userService = inject(UserService);

  newPromotion = new Promotion();
  editingPromotionId = '';
  editPromotion = new Promotion();
  message = '';
  success = false;

  ngOnChanges() {
    this.newPromotion = new Promotion();
    this.editingPromotionId = '';
    this.editPromotion = new Promotion();
    this.message = '';
  }

  addPromotion() {
    const user = this.userService.getLoggedUser();
    if (!user || !this.promotionIsValid(this.newPromotion)) {
      this.message = 'Podaci promocije nisu ispravni.';
      this.success = false;
      return;
    }
    this.facilityService
      .addPromotion(this.facility._id, user.username, this.newPromotion)
      .subscribe({
        next: (response) => {
          this.facility.promotions = response.facility.promotions;
          this.newPromotion = new Promotion();
          this.message = response.message;
          this.success = true;
        },
        error: (error) => {
          this.message = error.error?.message || 'Dodavanje promocije nije uspelo.';
          this.success = false;
        },
      });
  }

  startEdit(promotion: Promotion) {
    this.editingPromotionId = promotion._id;
    this.editPromotion = new Promotion();
    this.editPromotion._id = promotion._id;
    this.editPromotion.name = promotion.name;
    this.editPromotion.sport = promotion.sport;
    this.editPromotion.discountType = promotion.discountType;
    this.editPromotion.discountValue = promotion.discountValue;
    this.editPromotion.startDate = promotion.startDate.slice(0, 10);
    this.editPromotion.endDate = promotion.endDate.slice(0, 10);
  }

  updatePromotion() {
    const user = this.userService.getLoggedUser();
    if (!user || !this.promotionIsValid(this.editPromotion)) {
      this.message = 'Podaci promocije nisu ispravni.';
      this.success = false;
      return;
    }
    this.facilityService
      .updatePromotion(this.facility._id, user.username, this.editPromotion)
      .subscribe({
        next: (response) => {
          this.facility.promotions = response.facility.promotions;
          this.editingPromotionId = '';
          this.message = response.message;
          this.success = true;
        },
        error: (error) => {
          this.message = error.error?.message || 'Izmena promocije nije uspela.';
          this.success = false;
        },
      });
  }

  private promotionIsValid(promotion: Promotion) {
    return Boolean(
      promotion.name.trim() &&
        promotion.sport &&
        promotion.startDate &&
        promotion.endDate &&
        promotion.endDate >= promotion.startDate &&
        promotion.discountValue > 0 &&
        (promotion.discountType !== 'percentage' || promotion.discountValue <= 100)
    );
  }
}
