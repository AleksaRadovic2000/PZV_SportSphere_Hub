import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { Message, RegisterUser, User, UserResponse } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  uri = `${environment.apiUrl}/users`;

  login(username: string, password: string) {
    return this.http.post<UserResponse>(`${this.uri}/login`, {
      username,
      password,
    });
  }

  adminLogin(username: string, password: string) {
    return this.http.post<UserResponse>(`${this.uri}/admin-login`, {
      username,
      password,
    });
  }

  register(user: RegisterUser, profileImage: File | null) {
    const formData = new FormData();
    formData.append('user', JSON.stringify(user));

    if (profileImage) {
      formData.append('profileImage', profileImage);
    }

    return this.http.post<UserResponse>(`${this.uri}/register`, formData);
  }

  generateAvatar(seed: string) {
    return this.http.post(`${this.uri}/generate-avatar`, { seed }, { responseType: 'blob' });
  }

  requestPasswordReset(identifier: string) {
    return this.http.post<Message>(`${this.uri}/request-reset`, {
      identifier,
    });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<Message>(`${this.uri}/reset-password`, {
      token,
      newPassword,
    });
  }

  saveLoggedUser(user: User) {
    localStorage.setItem('loggedUser', JSON.stringify(user));
  }

  getLoggedUser() {
    const storedUser = localStorage.getItem('loggedUser');

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser) as User;
  }

  logout() {
    localStorage.removeItem('loggedUser');
  }

  getHomeRoute(user: User) {
    if (user.role === 'athlete') {
      return '/athlete/profile';
    }

    if (user.role === 'employee') {
      return '/employee/profile';
    }

    return '/admin/requests';
  }
}
