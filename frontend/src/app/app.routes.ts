import { Routes } from '@angular/router';
import { CanchaDetailComponent } from './components/cancha-detail.component';
import { CanchaFormComponent } from './components/cancha-form.component';
import { CanchaListComponent } from './components/cancha-list.component';
import { ChatbotComponent } from './components/chatbot.component';
import { ComplejoFormComponent } from './components/complejo-form.component';
import { ComplejoListComponent } from './components/complejo-list.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'canchas' },
  { path: 'canchas', component: CanchaListComponent },
  { path: 'canchas/nueva', component: CanchaFormComponent },
  { path: 'canchas/:id/editar', component: CanchaFormComponent },
  { path: 'canchas/:id', component: CanchaDetailComponent },
  { path: 'complejos', component: ComplejoListComponent },
  { path: 'complejos/nuevo', component: ComplejoFormComponent },
  { path: 'complejos/:id/editar', component: ComplejoFormComponent },
  { path: 'chat', component: ChatbotComponent },
  { path: '**', redirectTo: 'canchas' }
];
