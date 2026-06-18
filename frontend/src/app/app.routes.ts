import { Routes } from '@angular/router';
import { NetImpactFeedComponent } from './features/net-impact-feed/net-impact-feed.component';

export const routes: Routes = [
  { path: '', component: NetImpactFeedComponent },
  { path: '**', redirectTo: '' }
];
