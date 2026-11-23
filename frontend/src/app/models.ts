export interface Complejo {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string | null;
}

export interface Cancha {
  id: number;
  nombre: string;
  tipo: 'F5' | 'F7' | 'F11';
  superficie: string;
  techada: boolean;
  precio_hora: number;
  disponible: boolean;
  complejo_id: number;
  complejo_nombre: string;
}

export interface CanchaInput {
  nombre: string;
  tipo: Cancha['tipo'];
  superficie: string;
  techada: boolean;
  precio_hora: number;
  disponible: boolean;
  complejo_id: number;
}

export interface ComplejoInput {
  nombre: string;
  direccion: string;
  telefono: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}
