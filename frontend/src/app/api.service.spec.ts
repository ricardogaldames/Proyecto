import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads courts and sends list filters as query parameters', () => {
    service.getCanchas({ q: 'sintético', disponible: 'true' }).subscribe();
    const request = http.expectOne((req) => req.url === 'http://localhost:5001/api/canchas');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('sintético');
    expect(request.request.params.get('disponible')).toBe('true');
    request.flush([]);
  });

  it('creates a court through the API service', () => {
    const court = {
      nombre: 'Cancha 1',
      tipo: 'F5' as const,
      superficie: 'Sintético',
      techada: false,
      precio_hora: 15000,
      disponible: true,
      complejo_id: 1
    };
    service.createCancha(court).subscribe();
    const request = http.expectOne('http://localhost:5001/api/canchas');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(court);
    request.flush({ ...court, id: 2, complejo_nombre: 'El Potrero' });
  });

  it('sends chatbot questions to Flask instead of calling the model from the browser', () => {
    service.askChat('¿Qué canchas están disponibles?').subscribe();
    const request = http.expectOne('http://localhost:5001/api/chat');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ message: '¿Qué canchas están disponibles?' });
    request.flush({ answer: 'La cancha 1 está disponible.' });
  });
});
