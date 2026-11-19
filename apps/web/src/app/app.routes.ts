import { Routes } from '@angular/router';
import { RequestListComponent } from './features/requests/request-list/request-list';

export const routes: Routes = [
  { path: '', component: RequestListComponent },
  { path: '**', redirectTo: '' },
];
