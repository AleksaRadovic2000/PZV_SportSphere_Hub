import { Component, inject, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../models/shop';
import { Sport } from '../../../../models/sport';
import { ShopService } from '../../../../services/shop';
import { UserService } from '../../../../services/user';
import { validateImage } from '../../../../shared/image-utils';

@Component({
  selector: 'app-employee-products',
  imports: [FormsModule],
  templateUrl: './employee-products.html',
})
export class EmployeeProducts implements OnChanges {
  @Input() facilityId = '';
  @Input() sports: Sport[] = [];
  @Input() refreshToken = 0;
  private shopService = inject(ShopService);
  private userService = inject(UserService);

  products: Product[] = [];
  newProduct = new Product();
  newImage: File | null = null;
  editingProductId = '';
  editPrice = 0;
  editStock = 0;
  editActive = true;
  editImage: File | null = null;
  message = '';
  success = false;

  ngOnChanges() {
    this.newProduct = new Product();
    this.newProduct.facilityId = this.facilityId;
    this.newImage = null;
    this.cancelEdit();
    this.loadProducts();
  }

  loadProducts() {
    const user = this.userService.getLoggedUser();
    if (!user || !this.facilityId) {
      this.products = [];
      return;
    }
    this.shopService.getFacilityProducts(this.facilityId, user.username).subscribe({
      next: (products) => (this.products = products),
      error: (error) => {
        this.message = error.error?.message || 'Proizvode nije moguce ucitati.';
        this.success = false;
      },
    });
  }

  selectNewImage(event: Event) {
    this.newImage = this.readImage(event);
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
    this.editImage = this.readImage(event);
  }

  updateProduct(product: Product) {
    const user = this.userService.getLoggedUser();
    if (!user || this.editPrice <= 0 || !Number.isInteger(this.editStock) || this.editStock < 0) {
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

  getImageUrl(image: string) {
    return this.shopService.getImageUrl(image);
  }

  private readImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return null;
    const validationMessage = validateImage(file, 'Slika proizvoda');
    if (validationMessage) {
      input.value = '';
      this.message = validationMessage;
      this.success = false;
      return null;
    }
    this.message = '';
    return file;
  }
}
