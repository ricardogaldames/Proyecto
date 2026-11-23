import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { Cancha, CanchaInput, Complejo } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/canchas">← Volver a canchas</a>
    <section class="form-card">
      <p class="eyebrow">INVENTARIO</p>
      <h1>{{ editing ? 'Editar cancha' : 'Nueva cancha' }}</h1>
      <p class="subheading">Completá los datos y elegí el complejo al que pertenece.</p>
      @if (loading) {
        <div class="state-message" role="status">Cargando datos…</div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <label>Nombre
              <input formControlName="nombre" placeholder="Cancha Norte">
              @if (invalid('nombre')) { <small class="field-error">Ingresá un nombre.</small> }
            </label>
            <label>Tipo
              <select formControlName="tipo">
                <option value="F5">F5</option><option value="F7">F7</option><option value="F11">F11</option>
              </select>
            </label>
            <label>Superficie
              <input formControlName="superficie" placeholder="Sintético">
              @if (invalid('superficie')) { <small class="field-error">Ingresá la superficie.</small> }
            </label>
            <label>Precio por hora (ARS)
              <input type="number" min="1" formControlName="precio_hora">
              @if (invalid('precio_hora')) { <small class="field-error">El precio debe ser mayor a cero.</small> }
            </label>
            <label class="wide">Complejo
              <select formControlName="complejo_id">
                <option [ngValue]="0" disabled>Seleccioná un complejo</option>
                @for (complex of complejos; track complex.id) {
                  <option [ngValue]="complex.id">{{ complex.nombre }}</option>
                }
              </select>
              @if (invalid('complejo_id')) { <small class="field-error">Elegí un complejo existente.</small> }
              @if (!complejos.length) { <small class="field-hint">Primero creá un complejo para registrar canchas.</small> }
            </label>
            <div class="wide checkbox-row">
              <label class="check"><input type="checkbox" formControlName="techada"> Techada</label>
              <label class="check"><input type="checkbox" formControlName="disponible"> Disponible</label>
            </div>
          </div>
          @if (error) { <p class="form-error" role="alert">{{ error }}</p> }
          <div class="form-actions">
            <a class="button" routerLink="/canchas">Cancelar</a>
            <button class="button primary" type="submit" [disabled]="saving || !complejos.length">
              {{ saving ? 'Guardando…' : 'Guardar cancha' }}
            </button>
          </div>
        </form>
      }
    </section>
  `
})
export class CanchaFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['F5' as Cancha['tipo'], Validators.required],
    superficie: ['', [Validators.required, Validators.maxLength(100)]],
    precio_hora: [1, [Validators.required, Validators.min(1)]],
    complejo_id: [0, [Validators.required, Validators.min(1)]],
    techada: [false],
    disponible: [true]
  });
  complejos: Complejo[] = [];
  editing = false;
  loading = true;
  saving = false;
  error = '';
  private courtId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editing = idParam !== null;
    this.courtId = idParam === null ? null : Number(idParam);
    this.api.getComplejos().subscribe({
      next: (items) => {
        this.complejos = items;
        if (this.courtId === null) {
          this.loading = false;
          return;
        }
        if (!Number.isInteger(this.courtId) || this.courtId < 1) {
          this.error = 'El identificador de cancha no es válido.';
          this.loading = false;
          return;
        }
        this.api.getCancha(this.courtId).subscribe({
          next: (court) => {
            this.form.patchValue({
              nombre: court.nombre,
              tipo: court.tipo,
              superficie: court.superficie,
              precio_hora: court.precio_hora,
              complejo_id: court.complejo_id,
              techada: court.techada,
              disponible: court.disponible
            });
            this.loading = false;
          },
          error: (error: HttpErrorResponse) => this.fail(error)
        });
      },
      error: (error: HttpErrorResponse) => this.fail(error)
    });
  }

  invalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.error = '';
    const payload: CanchaInput = this.form.getRawValue();
    const request = this.courtId === null
      ? this.api.createCancha(payload)
      : this.api.updateCancha(this.courtId, payload);
    request.subscribe({
      next: (court) => this.router.navigate(['/canchas', court.id]),
      error: (error: HttpErrorResponse) => {
        this.fail(error);
        this.saving = false;
      }
    });
  }

  private fail(error: HttpErrorResponse): void {
    this.error = error.error?.error ?? 'No se pudo guardar la cancha. Revisá que la API esté disponible.';
    this.loading = false;
  }
}
