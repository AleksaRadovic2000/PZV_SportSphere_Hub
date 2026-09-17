import { Routes } from '@angular/router';
import { AdminRequests } from './components/admin/admin-requests/admin-requests';
import { AthleteProfile } from './components/athlete/athlete-profile/athlete-profile';
import { EmployeeProfile } from './components/employee/employee-profile/employee-profile';
import { AdminLogin } from './components/public/admin-login/admin-login';
import { ForgotPassword } from './components/public/forgot-password/forgot-password';
import { Home } from './components/public/home/home';
import { Register } from './components/public/register/register';
import { ResetPassword } from './components/public/reset-password/reset-password';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'forgot-password',
    component: ForgotPassword,
  },
  {
    path: 'reset-password/:token',
    component: ResetPassword,
  },
  {
    path: 'system-admin-login',
    component: AdminLogin,
  },
  {
    path: 'athlete/profile',
    component: AthleteProfile,
    canActivate: [roleGuard],
    data: { roles: ['athlete'] },
  },
  {
    path: 'employee/profile',
    component: EmployeeProfile,
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
  },
  {
    path: 'admin/requests',
    component: AdminRequests,
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
