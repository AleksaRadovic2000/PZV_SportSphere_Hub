import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { Order, Product } from '../../../models/shop';
import { Sport } from '../../../models/sport';
import { FacilityService } from '../../../services/facility';
import { ShopService } from '../../../services/shop';
import { SportService } from '../../../services/sport';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-employee-catalog',
  imports: [FormsModule],
  templateUrl: './employee-catalog.html',
})
export class EmployeeCatalog implements OnInit {
  private facilityService = inject(FacilityService);
  private shopService = inject(ShopService);
  private sportService = inject(SportService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  sports: Sport[] = [];
  products: Product[] = [];
  orders: Order[] = [];
  newProduct = new Product();
  facilityId = '';
  newImage: File | null = null;
  editingProductId = '';
  editPrice = 0;
  editStock = 0;
  editActive = true;
  editImage: File | null = null;
  message = '';
  success = false;

  ngOnInit() {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.facilityService.getEmployeeFacilities(user.username).subscribe({
      next: (facilities) => {
        this.facilities = facilities.filter((facility) => facility.status === 'active');

        if (this.facilities.length > 0) {
          this.facilityId = this.facilities[0]._id;
          this.facilityChanged();
        }
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

  facilityChanged() {
    this.newProduct = new Product();
    this.newProduct.facilityId = this.facilityId;
    this.newImage = null;
    this.cancelEdit();
    this.loadProducts();
    this.loadOrders();
  }

  loadProducts() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId) {
      this.products = [];
      return;
    }

    this.shopService.getFacilityProducts(this.facilityId, user.username).subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        this.message = error.error?.message || 'Proizvode nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  loadOrders() {
    const user = this.userService.getLoggedUser();

    if (!user || !this.facilityId) {
      this.orders = [];
      return;
    }

    this.shopService.getFacilityOrders(this.facilityId, user.username).subscribe({
      next: (orders) => {
        this.orders = orders;
      },
      error: (error) => {
        this.message = error.error?.message || 'Porudzbine nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  selectNewImage(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newImage = input.files?.[0] || null;
  }

  addProduct() {
    const user = this.userService.getLoggedUser();
    this.newProduct.facilityId = this.facilityId;

    if (
      !user ||
      !this.newProduct.name.trim() ||
      !this.newProduct.sport ||
      this.newProduct.price <= 0 ||
      !Number.isInteger(this.newProduct.stock) ||
      this.newProduct.stock < 0 ||
      !this.newImage
    ) {
      this.message = 'Popunite ispravno sva polja proizvoda i izaberite sliku.';
      this.success = false;
      return;
    }

    this.shopService.addProduct(this.newProduct, user.username, this.newImage).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.newProduct = new Product();
        this.newProduct.facilityId = this.facilityId;
        this.newImage = null;
        this.loadProducts();
      },
      error: (error) => {
        this.message = error.error?.message || 'Dodavanje proizvoda nije uspelo.';
        this.success = false;
      },
    });
  }

  startEdit(product: Product) {
    this.editingProductId = product._id;
    this.editPrice = product.price;
    this.editStock = product.stock;
    this.editActive = product.active;
    this.editImage = null;
  }

  selectEditImage(event: Event) {
    const input = event.target as HTMLInputElement;
    this.editImage = input.files?.[0] || null;
  }

  updateProduct(product: Product) {
    const user = this.userService.getLoggedUser();

    if (
      !user ||
      this.editPrice <= 0 ||
      !Number.isInteger(this.editStock) ||
      this.editStock < 0
    ) {
      this.message = 'Cena i stanje nisu ispravni.';
      this.success = false;
      return;
    }

    const updatedProduct = new Product();
    updatedProduct._id = product._id;
    updatedProduct.price = this.editPrice;
    updatedProduct.stock = this.editStock;
    updatedProduct.active = this.editActive;

    this.shopService.updateProduct(updatedProduct, user.username, this.editImage).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.cancelEdit();
        this.loadProducts();
      },
      error: (error) => {
        this.message = error.error?.message || 'Izmena proizvoda nije uspela.';
        this.success = false;
      },
    });
  }

  cancelEdit() {
    this.editingProductId = '';
    this.editImage = null;
  }

  updateOrderStatus(order: Order, status: string) {
    const user = this.userService.getLoggedUser();

    if (!user) {
      return;
    }

    this.shopService.updateOrderStatus(order._id, user.username, status).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.loadOrders();
        this.loadProducts();
      },
      error: (error) => {
        this.message = error.error?.message || 'Promena statusa nije uspela.';
        this.success = false;
      },
    });
  }

  getImageUrl(image: string) {
    return this.shopService.getImageUrl(image);
  }

  formatDateTime(value: string) {
    return new Date(value).toLocaleString('sr-Latn-RS');
  }
}
