import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { ChatMessage } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-heading">
      <div>
        <p class="eyebrow">ASISTENTE DE EL TOPO</p>
        <h1>Preguntale a tus datos</h1>
        <p class="subheading">El asistente consulta las canchas registradas antes de responder.</p>
      </div>
    </section>
    <section class="chat-panel panel">
      <div class="chat-intro">
        <span class="assistant-avatar">T</span>
        <div><strong>Asistente de complejos</strong><small>Información actualizada desde la base de datos</small></div>
      </div>
      <div class="chat-messages" #messageList aria-live="polite">
        @for (message of messages; track $index) {
          <div class="chat-bubble" [class.user-bubble]="message.role === 'user'">
            <span>{{ message.role === 'user' ? 'Vos' : 'Asistente' }}</span>
            <p>{{ message.text }}</p>
          </div>
        }
        @if (loading) {
          <div class="chat-bubble" role="status"><span>Asistente</span><p>Estoy revisando los datos…</p></div>
        }
      </div>
      @if (error) { <p class="chat-error" role="alert">{{ error }}</p> }
      <form class="chat-form" (ngSubmit)="send()">
        <label class="sr-only" for="chat-message">Tu pregunta</label>
        <input id="chat-message" name="message" [(ngModel)]="question" maxlength="1000" placeholder="Ej.: ¿Qué canchas están disponibles?" [disabled]="loading">
        <button class="button primary" type="submit" [disabled]="loading || !question.trim()">Enviar</button>
      </form>
      <p class="chat-note">La clave de Gemini se configura sólo en Flask. No la compartas ni la subas al repositorio.</p>
    </section>
  `
})
export class ChatbotComponent {
  private readonly api = inject(ApiService);
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [
    { role: 'assistant', text: '¡Hola! Puedo contarte qué canchas hay, cuáles están disponibles, sus precios y a qué complejo pertenecen.' }
  ];
  question = '';
  loading = false;
  error = '';

  send(): void {
    const message = this.question.trim();
    if (!message || this.loading) return;
    this.messages = [...this.messages, { role: 'user', text: message }];
    this.question = '';
    this.error = '';
    this.loading = true;
    this.scrollToLatest();
    this.api.askChat(message).subscribe({
      next: ({ answer }) => {
        this.messages = [...this.messages, { role: 'assistant', text: answer }];
        this.loading = false;
        this.scrollToLatest();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.error ?? 'No se pudo conectar con el chatbot. Revisá que Flask y la clave de Gemini estén configurados.';
        this.loading = false;
      }
    });
  }

  private scrollToLatest(): void {
    setTimeout(() => {
      const element = this.messageList?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}
