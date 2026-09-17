import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user';

export const roleGuard: CanActivateFn = (route) => {
  const userService = inject(UserService);
  const router = inject(Router);
  const user = userService.getLoggedUser();
  const allowedRoles = route.data['roles'] as string[];

  if (!user || !allowedRoles.includes(user.role)) {
    return router.parseUrl('/');
  }

  return true;
};
