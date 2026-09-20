export class Product {
  _id = '';
  facilityId = '';
  sport = '';
  name = '';
  image = '';
  price = 0;
  stock = 0;
  active = true;
}

export class CartItem {
  product = new Product();
  quantity = 1;
}

export class OrderItem {
  _id = '';
  productId = '';
  productName = '';
  unitPrice = 0;
  quantity = 1;
}

export class Order {
  _id = '';
  athleteUsername = '';
  facilityId = '';
  facilityName = '';
  items: OrderItem[] = [];
  totalPrice = 0;
  status = 'ordered';
  createdAt = '';
}

export class ProductResponse {
  message = '';
  product = new Product();
}

export class OrderResponse {
  message = '';
  order = new Order();
}
