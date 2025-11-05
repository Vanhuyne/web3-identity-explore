import { Routes } from '@angular/router';

export const routes: Routes = [
    {
    path: '',                    // URL: http://localhost:4200/
    loadComponent: () => import('./components/home-component/home-component')
      .then(m => m.HomeComponent)
  },
  {
    path: '**',
    redirectTo: '',
  },
];
