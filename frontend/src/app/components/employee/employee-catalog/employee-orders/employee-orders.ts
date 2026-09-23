import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { Order } from '../../../../models/shop';
import { ShopService } from '../../../../services/shop';
import { UserService } from '../../../../services/user';
import { formatDateTime } from '../../../../shared/date-utils';
import { getSerbianLabel } from '../../../../shared/serbian-label';

@Component({ selector: 'app-employee-orders', templateUrl: './employee-orders.html' })
export class EmployeeOrders implements OnChanges {
  @Input() facilityId = '';
  @Output() productsChanged = new EventEmitter<void>();
  private shopService = inject(ShopService);
  private userService = inject(UserService);
  label = getSerbianLabel;
  formatDateTime = formatDateTime;
  orders: Order[] = [];
  message = '';
  success = false;

  ngOnChanges() {
    this.loadOrders();
  }

  loadOrders() {
    const user = this.userService.getLoggedUser();
    if (!user || !this.facilityId) {
      this.orders = [];
      return;
    }
    this.shopService.getFacilityOrders(this.facilityId, user.username).subscribe({
      next: (orders) => (this.orders = orders),
      error: (error) => {
        this.message = error.error?.message || 'Porudzbine nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  updateOrderStatus(order: Order, status: string) {
    const user = this.userService.getLoggedUser();
    if (!user) return;
    this.shopService.updateOrderStatus(order._id, user.username, status).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadOrders();
        this.productsChanged.emit();
      },
      error: (error) => {
        this.message = error.error?.message || 'Promena statusa nije uspela.';
        this.success = false;
      },
    });
  }
}
