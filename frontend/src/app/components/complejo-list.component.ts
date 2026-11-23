import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../api.service';
import { Cancha, Complejo } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-heading">
      <div>
        <p class="eyebrow">SEDES</p>
        <h1>Complejos</h1>
        <p class="subheading">Cada complejo puede tener varias canchas.</p>
      </div>
      <a class="button primary" routerLink="/complejos/nuevo">＋ Nuevo complejo</a>
    </section>
    <section class="panel">
      <div class="toolbar">
        <label class="search-field">
          <span aria-hidden="true">⌕</span>
          <input type="search" [(ngModel)]="query" (ngModelChange)="load()" placeholder="Buscar por nombre o dirección" aria-label="Buscar complejo">
        </label>
      </div>
      @if (loading) {
        <div class="state-message" role="status">Cargando complejos…</div>
      } @else if (error) {
        <div class="state-message error" role="alert">{{ error }}</div>
      } @else if (!complejos.length) {
        <div class="state-message">No hay complejos. Creá el primero para poder registrar canchas.</div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead><tr><th>Complejo</th><th>Dirección</th><th>Teléfono</th><th>Canchas</th><th>Acciones</th></tr></thead>
            <tbody>
              @for (complex of complejos; track complex.id) {
                <tr>
                  <td><strong>{{ complex.nombre }}</strong><small>#{{ complex.id }}</small></td>
                  <td>{{ complex.direccion }}</td>
                  <td>{{ complex.telefono || '—' }}</td>
                  <td><span class="badge green">{{ courtsFor(complex.id) }} cancha(s)</span></td>
                  <td class="actions">
                    <a class="button small" [routerLink]="['/complejos', complex.id, 'editar']">Editar</a>
                    <button class="button small danger" type="button" (click)="remove(complex)">Borrar</button>
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
export class ComplejoListComponent implements OnInit {
  private readonly api = inject(ApiService);
  complejos: Complejo[] = [];
  canchas: Cancha[] = [];
  query = '';
  loading = true;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      complejos: this.api.getComplejos(this.query.trim()),
      canchas: this.api.getCanchas()
    }).subscribe({
      next: ({ complejos, canchas }) => {
        this.complejos = complejos;
        this.canchas = canchas;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'No se pudo conectar con la API. Revisá que Flask esté funcionando.';
        this.loading = false;
      }
    });
  }

  courtsFor(complexId: number): number {
    return this.canchas.filter((court) => court.complejo_id === complexId).length;
  }

  remove(complex: Complejo): void {
    if (!confirm(`¿Borrar el complejo "${complex.nombre}"?`)) return;
    this.api.deleteComplejo(complex.id).subscribe({
      next: () => this.load(),
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'No se pudo borrar el complejo.';
      }
    });
  }
}
