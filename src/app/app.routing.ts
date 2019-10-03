import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Import Containers
import { FullLayoutComponent, SimpleLayoutComponent } from './containers';
import { AuthGuardService as AuthGuard } from './services/auth-guard.service';
import { PermissionsGuardService as PermissionsGuard } from './services/permissions-guard.service';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'pages',
    component: FullLayoutComponent,
    canActivate: [AuthGuard, PermissionsGuard],
    data: { title: 'Home' }, // children: [
    //   {
    //     path: 'profile',
    //     component: './views/components/profile/profile.module#ProfileModule'
    //   },
    //   {
    //     path: 'patient',
    //     component:'./views/components/patient/patient.module#PatientModule'
    //   },
    //   {
    //     path: 'consultation',
    //     component: ConsultationModule,
    //     runGuardsAndResolvers: 'always'
    //   },
    //   {
    //     path: 'payment',
    //     component: PaymentModule
    //   },
    //   {
    //     path: 'clinic',
    //     component: ClinicModule
    //   },
    //   {
    //     path: 'communications',
    //     component: CommunicationsModule
    //   }
    // ]
    children: [
      { path: 'profile', loadChildren: './views/components/business/profile/profile.module#ProfileModule' },
      { path: 'patient', loadChildren: './views/components/business/patient/patient.module#PatientModule' },
      { path: 'appointments', loadChildren: './views/components/business/appointments/appointments.module#AppointmentsModule' },
      {
        path: 'consultation',
        loadChildren: './views/components/business/consultation/consultation.module#ConsultationModule',
        runGuardsAndResolvers: 'always'
      },
      { path: 'payment', loadChildren: './views/components/business/payment/payment.module#PaymentModule' },
      { path: 'clinic', loadChildren: './views/components/business/clinic/clinic.module#ClinicModule' },
      {
        path: 'communications',
        loadChildren: './views/components/business/communications/communications.module#CommunicationsModule'
      },
      {
        path: 'test',
        loadChildren: './views/components/business/test/test.module#TestModule'
      }
    ]
  },
  {
    path: '',
    component: SimpleLayoutComponent,
    data: { title: 'Pages' },
    children: [{ path: '', loadChildren: './views/pages/pages.module#PagesModule' }]
  },
  { path: '**', redirectTo: '/pages/patient/list' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload', useHash: true, enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
