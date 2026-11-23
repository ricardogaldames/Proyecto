import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { Cancha } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/canchas">← Volver a canchas</a>
    @if (loading) {
      <div class="state-message" role="status">Cargando detalle…</div>
    } @else if (error) {
      <div class="state-message error" role="alert">{{ error }}</div>
    } @else if (court) {
      <section class="page-heading">
        <div>
          <p class="eyebrow">DETALLE DE CANCHA · #{{ court.id }}</p>
          <h1>{{ court.nombre }}</h1>
          <p class="subheading">{{ court.complejo_nombre }}</p>
        </div>
        <a class="button primary" [routerLink]="['/canchas', court.id, 'editar']">Editar cancha</a>
      </section>
      <section class="detail-grid panel">
        <article><span>Tipo</span><strong>{{ court.tipo }}</strong></article>
        <article><span>Superficie</span><strong>{{ court.superficie }}</strong></article>
        <article><span>Precio por hora</span><strong>{{ court.precio_hora | currency:'ARS':'symbol-narrow':'1.0-0':'es-AR' }}</strong></article>
        <article><span>Disponibilidad</span><strong>{{ court.disponible ? 'Disponible' : 'No disponible' }}</strong></article>
        <article><span>Techada</span><strong>{{ court.techada ? 'Sí' : 'No' }}</strong></article>
        <article><span>Complejo relacionado</span><strong>{{ court.complejo_nombre }}</strong></article>
      </section>
    }
  `
})
export class CanchaDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  court: Cancha | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.error = 'El identificador de cancha no es válido.';
      this.loading = false;
      return;
    }
    this.api.getCancha(id).subscribe({
      next: (court) => {
        this.court = court;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'No se pudo cargar la cancha.';
        this.loading = false;
      }
    });
  }
}
