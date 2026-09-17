export class User {
  _id = '';
  username = '';
  firstName = '';
  lastName = '';
  phone = '';
  email = '';
  profileImage = '';
  role = 'athlete';
  status = 'pending';
  favouriteSports: string[] = [];
  companyName = '';
  companyAddress = '';
  registrationNumber = '';
  taxId = '';
}

export class RegisterUser {
  username = '';
  password = '';
  firstName = '';
  lastName = '';
  phone = '';
  email = '';
  role = 'athlete';
  favouriteSports: string[] = [];
  companyName = '';
  companyAddress = '';
  registrationNumber = '';
  taxId = '';
}

export class UserResponse {
  message = '';
  user = new User();
}

export class Message {
  message = '';
  resetUrl = '';
}
