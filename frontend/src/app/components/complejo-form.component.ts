import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../api.service';
import { ComplejoInput } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/complejos">← Volver a complejos</a>
    <section class="form-card">
      <p class="eyebrow">SEDES</p>
      <h1>{{ editing ? 'Editar complejo' : 'Nuevo complejo' }}</h1>
      <p class="subheading">Los complejos agrupan las canchas en una relación de uno a muchos.</p>
      @if (loading) {
        <div class="state-message" role="status">Cargando datos…</div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <label class="wide">Nombre
              <input formControlName="nombre" placeholder="Complejo El Potrero">
              @if (invalid('nombre')) { <small class="field-error">Ingresá un nombre.</small> }
            </label>
            <label class="wide">Dirección
              <input formControlName="direccion" placeholder="Av. Siempreviva 123">
              @if (invalid('direccion')) { <small class="field-error">Ingresá una dirección.</small> }
            </label>
            <label class="wide">Teléfono (opcional)
              <input formControlName="telefono" placeholder="11-5555-0000">
            </label>
          </div>
          @if (error) { <p class="form-error" role="alert">{{ error }}</p> }
          <div class="form-actions">
            <a class="button" routerLink="/complejos">Cancelar</a>
            <button class="button primary" type="submit" [disabled]="saving">{{ saving ? 'Guardando…' : 'Guardar complejo' }}</button>
          </div>
        </form>
      }
    </section>
  `
})
export class ComplejoFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    direccion: ['', [Validators.required, Validators.maxLength(200)]],
    telefono: ['']
  });
  editing = false;
  loading = true;
  saving = false;
  error = '';
  private complexId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.editing = idParam !== null;
    this.complexId = idParam === null ? null : Number(idParam);
    if (this.complexId === null) {
      this.loading = false;
      return;
    }
    if (!Number.isInteger(this.complexId) || this.complexId < 1) {
      this.error = 'El identificador de complejo no es válido.';
      this.loading = false;
      return;
    }
    this.api.getComplejo(this.complexId).subscribe({
      next: (complex) => {
        this.form.patchValue({
          nombre: complex.nombre,
          direccion: complex.direccion,
          telefono: complex.telefono ?? ''
        });
        this.loading = false;
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
    const value = this.form.getRawValue();
    const payload: ComplejoInput = {
      ...value,
      telefono: value.telefono.trim() || null
    };
    const request = this.complexId === null
      ? this.api.createComplejo(payload)
      : this.api.updateComplejo(this.complexId, payload);
    request.subscribe({
      next: () => this.router.navigate(['/complejos']),
      error: (error: HttpErrorResponse) => {
        this.fail(error);
        this.saving = false;
      }
    });
  }

  private fail(error: HttpErrorResponse): void {
    this.error = error.error?.error ?? 'No se pudo guardar el complejo. Revisá que la API esté disponible.';
    this.loading = false;
  }
}
