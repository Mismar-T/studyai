import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api.service';
import { Gemini } from '../core/gemini.service';

@Component({
  selector: 'app-tutor', standalone: true, imports: [FormsModule],
  template: `<h2>Tutor socrático</h2>
  @if (pdfs().length) {<div class="row"><select [(ngModel)]="pid" (ngModelChange)="chat.set([])">@for (p of pdfs(); track p.id) {<option [value]="p.id">{{ p.title }}</option>}</select>
  <span class="mu">Te responde con preguntas, no con soluciones.</span></div>
  <div class="card" style="min-height:200px">@for (m of chat(); track $index) {<div class="msg" [class.me]="m.role === 'user'" [class.ai]="m.role !== 'user'">{{ m.parts[0].text }}</div>}</div>
  <div class="row"><input style="flex:1" [(ngModel)]="msg" placeholder="Pregunta sobre el documento" (keydown.enter)="send()"><button (click)="send()" [disabled]="busy()">Enviar</button></div>
  @if (err()) {<p class="mu">{{ err() }}</p>}} @else {<p class="mu">Guarda un documento para charlar sobre él.</p>}`
})
export class Tutor {
  api = inject(Api); ai = inject(Gemini); pdfs = signal<any[]>([]); chat = signal<any[]>([]); busy = signal(false); err = signal(''); pid = ''; msg = '';
  async ngOnInit() { this.pdfs.set(await this.api.pdfs()); this.pid = this.pdfs()[0]?.id || ''; }
  async send() {
    const v = this.msg.trim(); if (!v || this.busy()) return; this.msg = ''; this.err.set(''); this.busy.set(true);
    const hist = [...this.chat(), { role: 'user', parts: [{ text: v }] }]; this.chat.set(hist);
    try {
      const p = this.pdfs().find(x => x.id === this.pid);
      const r = await this.ai.call(hist, { sys: 'Eres un tutor socrático. Nunca des la respuesta directa: guía al estudiante con preguntas reflexivas breves y pistas graduales. Responde en español y apóyate solo en este material:\n' + (p?.parsed_text || '').slice(0, 20000) });
      this.chat.set([...hist, { role: 'model', parts: [{ text: r }] }]);
    } catch (e: any) { this.chat.set(hist.slice(0, -1)); this.err.set(e.message); }
    this.busy.set(false);
  }
}
