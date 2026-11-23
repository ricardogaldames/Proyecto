import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { Cancha, Complejo } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-heading">
      <div>
        <p class="eyebrow">INVENTARIO</p>
        <h1>Canchas</h1>
        <p class="subheading">Administrá las canchas de todos tus complejos.</p>
      </div>
      <a class="button primary" routerLink="/canchas/nueva">＋ Nueva cancha</a>
    </section>

    <section class="stats-grid" aria-label="Resumen">
      <article class="stat"><span>Canchas encontradas</span><strong>{{ canchas.length }}</strong></article>
      <article class="stat"><span>Disponibles</span><strong>{{ availableCount }}</strong></article>
      <article class="stat"><span>Complejos</span><strong>{{ complejos.length }}</strong></article>
    </section>

    <section class="panel">
      <div class="toolbar">
        <label class="search-field">
          <span aria-hidden="true">⌕</span>
          <input type="search" [(ngModel)]="query" (ngModelChange)="load()" placeholder="Buscar cancha o superficie" aria-label="Buscar cancha">
        </label>
        <select [(ngModel)]="complexFilter" (ngModelChange)="load()" aria-label="Filtrar por complejo">
          <option value="">Todos los complejos</option>
          @for (complex of complejos; track complex.id) {
            <option [value]="complex.id">{{ complex.nombre }}</option>
          }
        </select>
        <select [(ngModel)]="availableFilter" (ngModelChange)="load()" aria-label="Filtrar por disponibilidad">
          <option value="">Todos los estados</option>
          <option value="true">Disponibles</option>
          <option value="false">No disponibles</option>
        </select>
      </div>

      @if (loading) {
        <div class="state-message" role="status">Cargando canchas…</div>
      } @else if (error) {
        <div class="state-message error" role="alert">{{ error }}</div>
      } @else if (!canchas.length) {
        <div class="state-message">No hay canchas para estos filtros. Probá otra búsqueda o creá una nueva.</div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Cancha</th><th>Tipo</th><th>Complejo</th><th>Superficie</th><th>Precio / hora</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              @for (court of canchas; track court.id) {
                <tr>
                  <td><a class="table-link" [routerLink]="['/canchas', court.id]">{{ court.nombre }}</a><small>#{{ court.id }}</small></td>
                  <td><span class="badge">{{ court.tipo }}</span></td>
                  <td>{{ court.complejo_nombre }}</td>
                  <td>{{ court.superficie }}{{ court.techada ? ' · Techada' : '' }}</td>
                  <td>{{ court.precio_hora | currency:'ARS':'symbol-narrow':'1.0-0':'es-AR' }}</td>
                  <td><span class="badge" [class.green]="court.disponible" [class.gray]="!court.disponible">{{ court.disponible ? 'Disponible' : 'No disponible' }}</span></td>
                  <td class="actions">
                    <a class="button small" [routerLink]="['/canchas', court.id, 'editar']">Editar</a>
                    <button class="button small danger" type="button" (click)="remove(court)">Borrar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `
})
export class CanchaListComponent implements OnInit {
  private readonly api = inject(ApiService);
  canchas: Cancha[] = [];
  complejos: Complejo[] = [];
  query = '';
  complexFilter = '';
  availableFilter = '';
  loading = true;
  error = '';

  get availableCount(): number {
    return this.canchas.filter((court) => court.disponible).length;
  }

  ngOnInit(): void {
    this.api.getComplejos().subscribe({
      next: (items) => this.complejos = items,
      error: (error: HttpErrorResponse) => this.error = this.errorMessage(error)
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const filters = {
      q: this.query.trim(),
      complejo: this.complexFilter,
      disponible: this.availableFilter
    };
    this.api.getCanchas(filters).subscribe({
      next: (items) => {
        this.canchas = items;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.errorMessage(error);
        this.loading = false;
      }
    });
  }

  remove(court: Cancha): void {
    if (!confirm(`¿Borrar la cancha "${court.nombre}"?`)) return;
    this.api.deleteCancha(court.id).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => this.error = this.errorMessage(error)
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    return error.error?.error ?? 'No se pudo conectar con la API. Revisá que Flask esté funcionando.';
  }
}
