import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { CartItem, Order, OrderResponse, Product, ProductResponse } from '../models/shop';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/shop`;

  searchProducts(facilityId: string, sport: string) {
    return this.http.post<Product[]>(`${this.uri}/products/search`, { facilityId, sport });
  }

  getFacilityProducts(facilityId: string, employeeUsername: string) {
    const params = new HttpParams().set('employeeUsername', employeeUsername);
    return this.http.get<Product[]>(`${this.uri}/products/facility/${facilityId}`, { params });
  }

  addProduct(product: Product, employeeUsername: string, image: File) {
    const formData = new FormData();
    formData.append('product', JSON.stringify(product));
    formData.append('employeeUsername', employeeUsername);
    formData.append('image', image);
    return this.http.post<ProductResponse>(`${this.uri}/products/add`, formData);
  }

  updateProduct(product: Product, employeeUsername: string, image: File | null) {
    const formData = new FormData();
    formData.append('product', JSON.stringify(product));
    formData.append('employeeUsername', employeeUsername);

    if (image) {
      formData.append('image', image);
    }

    return this.http.post<ProductResponse>(`${this.uri}/products/update`, formData);
  }

  createOrder(athleteUsername: string, facilityId: string, cart: CartItem[]) {
    const items = cart.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
    }));

    return this.http.post<OrderResponse>(`${this.uri}/orders/create`, {
      athleteUsername,
      facilityId,
      items,
    });
  }

  getAthleteOrders(username: string) {
    return this.http.get<Order[]>(`${this.uri}/orders/athlete/${username}`);
  }

  getFacilityOrders(facilityId: string, employeeUsername: string) {
    const params = new HttpParams().set('employeeUsername', employeeUsername);
    return this.http.get<Order[]>(`${this.uri}/orders/facility/${facilityId}`, { params });
  }

  cancelOrder(id: string, athleteUsername: string) {
    return this.http.post<OrderResponse>(`${this.uri}/orders/cancel`, {
      id,
      athleteUsername,
    });
  }

  updateOrderStatus(id: string, employeeUsername: string, status: string) {
    return this.http.post<OrderResponse>(`${this.uri}/orders/status`, {
      id,
      employeeUsername,
      status,
    });
  }

  getImageUrl(image: string) {
    return `${environment.apiUrl}/${image}`;
  }
}
