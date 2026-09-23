import { Component, inject, OnInit } from '@angular/core';
import { Order } from '../../../../models/shop';
import { ShopService } from '../../../../services/shop';
import { UserService } from '../../../../services/user';
import { formatDateTime } from '../../../../shared/date-utils';
import { getSerbianLabel } from '../../../../shared/serbian-label';

@Component({ selector: 'app-athlete-orders', templateUrl: './athlete-orders.html' })
export class AthleteOrders implements OnInit {
  private shopService = inject(ShopService);
  private userService = inject(UserService);
  label = getSerbianLabel;
  formatDateTime = formatDateTime;
  orders: Order[] = [];
  message = '';
  success = false;
  ngOnInit() {
    this.loadOrders();
  }
  get activeOrders() {
    return this.orders.filter((order) => ['ordered', 'accepted'].includes(order.status));
  }
  get orderHistory() {
    return this.orders.filter((order) => ['collected', 'cancelled'].includes(order.status));
  }
  loadOrders() {
    const user = this.userService.getLoggedUser();
    if (!user) return;
    this.shopService.getAthleteOrders(user.username).subscribe({
      next: (orders) => (this.orders = orders),
      error: (error) => {
        this.message = error.error?.message || 'Porudzbine nije moguce ucitati.';
        this.success = false;
      },
    });
  }
  cancelOrder(order: Order) {
    const user = this.userService.getLoggedUser();
    if (!user) return;
    this.shopService.cancelOrder(order._id, user.username).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadOrders();
      },
      error: (error) => {
        this.message = error.error?.message || 'Otkazivanje porudzbine nije uspelo.';
        this.success = false;
      },
    });
  }
}
