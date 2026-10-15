import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api.service';
import { Gemini } from '../core/gemini.service';
import { clean, parseLines, readPdf } from '../core/util';

@Component({
  selector: 'app-pdfs', standalone: true, imports: [FormsModule],
  template: `<h2>Documentos</h2><div class="card">
  <div class="row"><input placeholder="Título" [(ngModel)]="title"><select [(ngModel)]="subj">@for (s of subs(); track s.id) {<option [value]="s.id">{{ s.name }}</option>}</select><button class="g" (click)="newSub()">Nueva materia</button></div>
  <div class="drop" [class.h]="over" (dragover)="$event.preventDefault(); over = true" (dragleave)="over = false" (drop)="$event.preventDefault(); over = false; load($event.dataTransfer?.files?.[0])">
  Arrastra un PDF o TXT aquí, o <input type="file" accept=".pdf,.txt" (change)="load($any($event.target).files[0])"></div>
  <textarea rows="6" [(ngModel)]="text" placeholder="O pega el texto. Una línea con la pregunta y la siguiente con la respuesta (también vale pregunta|respuesta)."></textarea>
  <div class="row"><button (click)="parse(false)">Extraer línea por línea</button><button class="g" (click)="parse(true)">Analizar con IA</button></div>
  @if (msg()) {<p class="mu">{{ msg() }}</p>}</div>
  @if (draft(); as d) {<div class="card"><h3>Revisa antes de guardar ({{ d.qa.length }})</h3>
  @if (d.topics.length) {<p class="mu">Temas: {{ d.topics.join(', ') }}</p>}
  <table>@for (x of d.qa; track $index) {<tr><td><input [(ngModel)]="x.q" aria-label="Pregunta"></td><td><input [(ngModel)]="x.a" aria-label="Respuesta"></td><td><button class="g" (click)="d.qa.splice($index, 1)">✕</button></td></tr>}</table>
  <button (click)="save()">Guardar documento</button></div>}
  <h3>Guardados</h3>
  @for (p of pdfs(); track p.id) {<div class="card row"><b>{{ p.title }}</b><span class="mu">{{ p.subjects?.name }}</span><button class="g" style="margin-left:auto" (click)="del(p.id)">Eliminar</button></div>}
  @empty {<p class="mu">Todavía no hay documentos.</p>}`
})
export class Pdfs {
  api = inject(Api); ai = inject(Gemini); title = ''; subj = ''; text = ''; over = false;
  subs = signal<any[]>([]); pdfs = signal<any[]>([]); draft = signal<any>(null); msg = signal('');
  async ngOnInit() { await this.refresh(); }
  async refresh() { this.subs.set(await this.api.subjects()); this.pdfs.set(await this.api.pdfs()); if (!this.subj && this.subs().length) this.subj = this.subs()[0].id; }
  async newSub() { const n = prompt('Nombre de la materia:'); if (n?.trim()) { const s = await this.api.addSubject(n.trim()); await this.refresh(); this.subj = s.id; } }
  async load(f?: File) {
    if (!f) return; if (!this.title) this.title = f.name.replace(/\.\w+$/, ''); this.msg.set('Leyendo archivo…');
    try { this.text = /pdf$/i.test(f.name) ? await readPdf(f) : await f.text(); this.msg.set('Archivo leído'); } catch (e: any) { this.msg.set('No se pudo leer: ' + e.message); }
  }
  async parse(useAi: boolean) {
    if (!this.text.trim()) return this.msg.set('Carga o pega texto primero');
    let qa: any[] = [], topics: string[] = [];
    if (useAi) {
      this.msg.set('Analizando con IA…');
      try { const r = JSON.parse(clean(await this.ai.ask(`Del siguiente texto extrae los temas principales y un banco de preguntas con respuestas. Devuelve SOLO JSON: {"topics":["..."],"qa":[{"q":"","a":""}]}\n\nTEXTO:\n${this.text.slice(0, 30000)}`))); qa = r.qa; topics = r.topics || []; }
      catch (e: any) { return this.msg.set('Error de IA: ' + e.message); }
    } else qa = parseLines(this.text);
    if (!qa.length) return this.msg.set('No encontré pares pregunta/respuesta');
    this.msg.set(''); this.draft.set({ qa, topics });
  }
  async save() {
    const d = this.draft(); this.msg.set('Guardando…');
    try { await this.api.addPdf(this.title || 'Sin título', this.subj, this.text, d.topics, d.qa.filter((x: any) => x.q && x.a)); this.draft.set(null); this.title = ''; this.text = ''; this.msg.set('Guardado'); await this.refresh(); }
    catch (e: any) { this.msg.set('Error al guardar: ' + e.message); }
  }
  async del(id: string) { if (confirm('¿Eliminar documento y sus preguntas?')) { await this.api.delPdf(id); await this.refresh(); } }
}
