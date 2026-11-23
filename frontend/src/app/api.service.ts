import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Cancha, CanchaInput, Complejo, ComplejoInput } from './models';

const API_BASE_URL = 'http://localhost:5001/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getCanchas(filters: Record<string, string> = {}): Observable<Cancha[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<Cancha[]>(`${API_BASE_URL}/canchas`, { params });
  }

  getCancha(id: number): Observable<Cancha> {
    return this.http.get<Cancha>(`${API_BASE_URL}/canchas/${id}`);
  }

  createCancha(data: CanchaInput): Observable<Cancha> {
    return this.http.post<Cancha>(`${API_BASE_URL}/canchas`, data);
  }

  updateCancha(id: number, data: CanchaInput): Observable<Cancha> {
    return this.http.put<Cancha>(`${API_BASE_URL}/canchas/${id}`, data);
  }

  deleteCancha(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${API_BASE_URL}/canchas/${id}`);
  }

  getComplejos(query = ''): Observable<Complejo[]> {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<Complejo[]>(`${API_BASE_URL}/complejos`, { params });
  }

  getComplejo(id: number): Observable<Complejo> {
    return this.http.get<Complejo>(`${API_BASE_URL}/complejos/${id}`);
  }

  createComplejo(data: ComplejoInput): Observable<Complejo> {
    return this.http.post<Complejo>(`${API_BASE_URL}/complejos`, data);
  }

  updateComplejo(id: number, data: ComplejoInput): Observable<Complejo> {
    return this.http.put<Complejo>(`${API_BASE_URL}/complejos/${id}`, data);
  }

  deleteComplejo(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${API_BASE_URL}/complejos/${id}`);
  }

  askChat(message: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${API_BASE_URL}/chat`, { message });
  }
}

const API_BASE_URL = 'https://proyecto-dgtd.onrender.com';
