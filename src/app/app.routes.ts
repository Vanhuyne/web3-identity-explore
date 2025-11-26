import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',                    // URL: http://localhost:4200/
    loadComponent: () => import('./components/home-component/home-component')
      .then(m => m.HomeComponent)
  },
  {
    path: 'bookmarks',          // URL: http://localhost:4200/bookmarks
    loadComponent: () => import('./components/bookmarks-views/bookmarks-views')
      .then(m => m.BookmarksViews)
  },
  {
    path: 'reputation',          // URL: http://localhost:4200/reputation
    loadComponent: () => import('./components/reputation/reputation')
      .then(m => m.Reputation)
  },
  {
    path: '**',
    redirectTo: '',
  },
];
