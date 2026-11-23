import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" routerLink="/canchas" aria-label="El Topo, inicio">
          <span class="brand-mark">T</span>
          <span>El Topo <small>GESTIÓN DEPORTIVA</small></span>
        </a>
        <nav aria-label="Navegación principal">
          <a routerLink="/canchas" routerLinkActive="active">Canchas</a>
          <a routerLink="/complejos" routerLinkActive="active">Complejos</a>
          <a routerLink="/chat" routerLinkActive="active">Asistente IA</a>
        </nav>
      </header>
      <main class="page">
        <router-outlet />
      </main>
      <footer>El Topo · Administración de canchas y complejos</footer>
    </div>
  `
})
export class AppComponent {}
