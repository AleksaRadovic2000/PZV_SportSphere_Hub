import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Facility } from '../../../models/facility';
import { CartItem, Product } from '../../../models/shop';
import { Sport } from '../../../models/sport';
import { FacilityService } from '../../../services/facility';
import { ShopService } from '../../../services/shop';
import { SportService } from '../../../services/sport';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-athlete-shop',
  imports: [FormsModule],
  templateUrl: './athlete-shop.html',
})
export class AthleteShop implements OnInit {
  private facilityService = inject(FacilityService);
  private shopService = inject(ShopService);
  private sportService = inject(SportService);
  private userService = inject(UserService);

  facilities: Facility[] = [];
  sports: Sport[] = [];
  products: Product[] = [];
  cart: CartItem[] = [];
  facilityId = '';
  sport = '';
  message = '';
  success = false;

  ngOnInit() {
    this.facilityService.search('', [], '', '').subscribe({
      next: (facilities) => {
        this.facilities = facilities;
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

  searchProducts() {
    this.message = '';
    this.success = false;

    if (!this.facilityId) {
      this.message = 'Izaberite sportski objekat.';
      return;
    }

    this.shopService.searchProducts(this.facilityId, this.sport).subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        this.message = error.error?.message || 'Pretraga proizvoda nije uspela.';
      },
    });
  }

  addToCart(product: Product) {
    if (product.stock < 1) {
      this.message = 'Proizvod trenutno nije na stanju.';
      this.success = false;
      return;
    }

    if (this.cart.length > 0 && this.cart[0].product.facilityId !== product.facilityId) {
      this.message = 'Jedna korpa moze sadrzati proizvode samo jednog objekta.';
      this.success = false;
      return;
    }

    const existingItem = this.cart.find((item) => item.product._id === product._id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        this.message = 'Nije moguce dodati vise od raspolozive zalihe.';
        this.success = false;
        return;
      }

      existingItem.quantity++;
    } else {
      const item = new CartItem();
      item.product = product;
      item.quantity = 1;
      this.cart.push(item);
    }

    this.message = 'Proizvod je dodat u korpu.';
    this.success = true;
  }

  changeQuantity(item: CartItem) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      item.quantity = 1;
    }

    if (item.quantity > item.product.stock) {
      item.quantity = item.product.stock;
      this.message = 'Kolicina je ogranicena raspolozivom zalihom.';
      this.success = false;
    }
  }

  removeFromCart(productId: string) {
    this.cart = this.cart.filter((item) => item.product._id !== productId);
  }

  calculateTotal() {
    return this.cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  createOrder() {
    const user = this.userService.getLoggedUser();

    if (!user || this.cart.length === 0) {
      this.message = 'Korpa je prazna.';
      this.success = false;
      return;
    }

    const cartFacilityId = this.cart[0].product.facilityId;
    this.shopService.createOrder(user.username, cartFacilityId, this.cart).subscribe({
      next: (response) => {
        this.message = response.message;
        this.success = true;
        this.cart = [];
        this.searchProducts();
      },
      error: (error) => {
        this.message = error.error?.message || 'Kreiranje porudzbine nije uspelo.';
        this.success = false;
      },
    });
  }

  getImageUrl(image: string) {
    return this.shopService.getImageUrl(image);
  }
}
