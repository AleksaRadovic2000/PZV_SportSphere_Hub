import { Routes } from '@angular/router';
import { AdminRequests } from './components/admin/admin-requests/admin-requests';
import { AdminUsers } from './components/admin/admin-users/admin-users';
import { AthleteProfile } from './components/athlete/athlete-profile/athlete-profile';
import { AthleteFacilitySearch } from './components/athlete/athlete-facility-search/athlete-facility-search';
import { TeammateAds } from './components/athlete/teammate-ads/teammate-ads';
import { AthleteTournaments } from './components/athlete/athlete-tournaments/athlete-tournaments';
import { AthleteTrainings } from './components/athlete/athlete-trainings/athlete-trainings';
import { AthleteShop } from './components/athlete/athlete-shop/athlete-shop';
import { EmployeeProfile } from './components/employee/employee-profile/employee-profile';
import { EmployeeFacilities } from './components/employee/employee-facilities/employee-facilities';
import { FacilityForm } from './components/employee/facility-form/facility-form';
import { EmployeeTournaments } from './components/employee/employee-tournaments/employee-tournaments';
import { EmployeeOperations } from './components/employee/employee-operations/employee-operations';
import { EmployeeCatalog } from './components/employee/employee-catalog/employee-catalog';
import { AdminLogin } from './components/public/admin-login/admin-login';
import { ForgotPassword } from './components/public/forgot-password/forgot-password';
import { Home } from './components/public/home/home';
import { FacilityDetails } from './components/public/facility-details/facility-details';
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
    path: 'facilities/:id',
    component: FacilityDetails,
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
    path: 'athlete/facilities',
    component: AthleteFacilitySearch,
    canActivate: [roleGuard],
    data: { roles: ['athlete'] },
  },
  {
    path: 'athlete/teammates',
    component: TeammateAds,
    canActivate: [roleGuard],
    data: { roles: ['athlete'] },
  },
  {
    path: 'athlete/tournaments',
    component: AthleteTournaments,
    canActivate: [roleGuard],
    data: { roles: ['athlete'] },
  },
  {
    path: 'athlete/trainings',
    component: AthleteTrainings,
    canActivate: [roleGuard],
    data: { roles: ['athlete'] },
  },
  {
    path: 'athlete/shop',
    component: AthleteShop,
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
    path: 'employee/facilities',
    component: EmployeeFacilities,
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
  },
  {
    path: 'employee/facilities/new',
    component: FacilityForm,
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
  },
  {
    path: 'employee/tournaments',
    component: EmployeeTournaments,
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
  },
  {
    path: 'employee/operations',
    component: EmployeeOperations,
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
  },
  {
    path: 'employee/catalog',
    component: EmployeeCatalog,
    canActivate: [roleGuard],
    data: { roles: ['employee'] },
  },
  {
    path: 'employee/facilities/edit/:id',
    component: FacilityForm,
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
    path: 'admin/users',
    component: AdminUsers,
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
