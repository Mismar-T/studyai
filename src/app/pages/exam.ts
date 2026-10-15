import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { Gemini } from '../core/gemini.service';
import { Proctor } from '../core/proctor.service';
import { LV, Q, clean, fmt, okLocal, sh } from '../core/util';

@Component({
  selector: 'app-exam', standalone: true, imports: [FormsModule, RouterLink],
  template: `
  @if (st() === 'setup') {<h2>Simulador</h2><div class="card">
    @if (pdfs().length) {
      <div class="row"><select [(ngModel)]="pid">@for (p of pdfs(); track p.id) {<option [value]="p.id">{{ p.title }}</option>}</select>
      <label>Preguntas <input type="number" min="1" max="50" [(ngModel)]="n" style="width:5rem"></label></div>
      <div class="row"><select [(ngModel)]="lv">@for (l of [1,2,3,4,5,6]; track l) {<option [ngValue]="l">{{ l }}. {{ LV[l] }}</option>}</select><button (click)="start()">Comenzar</button></div>
      <p class="mu">Fácil: 4 opciones · Medio: 6 con trampas · Difícil: respuesta libre con 60 s · Avanzado y Complejo: usan la IA · Modo Examen: mixto, reloj global, penalización y antifraude.</p>
    } @else {<p class="mu">Primero guarda un documento en Documentos.</p>}
    @if (busy()) {<p>{{ busy() }}</p>}</div>
  }
  @if (st() === 'run') {
    <div class="row"><b>Pregunta {{ i() + 1 }}/{{ qs().length }}</b><span class="tag">{{ LV[L] }}</span>
    @if (L === 6) {<span class="tag">Strikes {{ strikes() }}/3</span>}
    <span class="clk" [class.low]="left() <= 10" style="margin-left:auto">@if (L >= 3) { {{ fmt(left()) }} }</span></div>
    <div class="bar"><i [style.width.%]="i() / qs().length * 100"></i></div>
    @if (note) {<p class="mu">{{ note }}</p>}
    @if (alert()) {<p class="card bad">⚠ {{ alert() }}</p>}
    <div class="card"><h3>{{ q().q }}</h3>
    @if (q().t === 'mc') {@for (o of q().o; track $index) {<button class="opt" (click)="ans(o)">{{ o }}</button>}}
    @else {<textarea rows="4" [(ngModel)]="txt" placeholder="Escribe tu respuesta"></textarea><button (click)="ans()">Responder</button>}</div>
  }
  @if (st() === 'res') {<h2>Resultado</h2>
    <div class="stats"><div class="card stat"><b>{{ res().g }}</b>nota (1–10)</div><div class="card stat"><b>{{ res().c }}/{{ qs().length }}</b>correctas</div>
    <div class="card stat"><b>+{{ res().xp }}</b>XP</div><div class="card stat"><b>{{ fmt(res().sec) }}</b>tiempo</div></div>
    @if (L === 6) {<div class="card" [class.good]="res().apto" [class.bad]="!res().apto"><h3>{{ res().apto ? 'APTO' : 'NO APTO' }}</h3><p>Penalización: −0,25 por error · Strikes: {{ strikes() }}</p>{{ res().ver }}</div>}
    <h3>Detalle</h3>
    @for (q of qs(); track $index) {<div class="card" [class.good]="res().r[$index].ok" [class.bad]="!res().r[$index].ok"><b>{{ q.q }}</b>
      <p>Tu respuesta: {{ answers[$index] || '(vacía)' }}</p>
      @if (!res().r[$index].ok) {<p>Respuesta ideal: {{ q.a }}</p>}
      @if (res().r[$index].fb) {<p class="mu">{{ res().r[$index].fb }}</p>}</div>}
    <button routerLink="/panel">Volver al panel</button> <button class="g" (click)="st.set('setup')">Otro examen</button>
  }`
})
export class Exam implements OnDestroy {
  api = inject(Api); ai = inject(Gemini); px = inject(Proctor); route = inject(ActivatedRoute);
  LV = LV; fmt = fmt; pdfs = signal<any[]>([]); st = signal<'setup' | 'run' | 'res'>('setup'); busy = signal(''); alert = signal('');
  qs = signal<Q[]>([]); i = signal(0); left = signal(0); strikes = signal(0); res = signal<any>({ r: [] });
  pid = ''; n = 10; lv = 1; L = 0; txt = ''; note = ''; answers: string[] = []; tm: any; t0 = 0; title = ''; pdfId: string | null = null; review = false;
  q = () => this.qs()[this.i()];

  async ngOnInit() {
    this.pdfs.set(await this.api.pdfs()); this.pid = this.pdfs()[0]?.id || '';
    if (this.route.snapshot.queryParamMap.get('review')) {
      const d = await this.api.due();
      if (d.length) this.run(sh(d).map((x: any) => ({ t: 'open' as const, q: x.question, a: x.answer, rid: x.id, step: x.step })), 0, 'Repaso', null, true);
    }
  }
  ngOnDestroy() { clearInterval(this.tm); this.px.stop(); }

  async start() {
    const p = this.pdfs().find(x => x.id === this.pid), l = +this.lv; this.busy.set('Preparando examen…');
    const all = await this.api.qa(p.id); if (!all.length) { this.busy.set('Este documento no tiene preguntas'); return; }
    let n = Math.max(1, +this.n || 10); if (l < 4 || l === 6) n = Math.min(n, all.length);
    const qa = sh(all).slice(0, n);
    const mc = (x: any, k: number): Q => ({ t: 'mc', q: x.q, a: x.a, o: sh([x.a, ...sh(all.filter(y => y.a !== x.a)).slice(0, k - 1).map(y => y.a)]) });
    const op = (x: any): Q => ({ t: 'open', q: x.q, a: x.a });
    let qs: Q[] = [], note = '';
    if (l === 1) qs = qa.map(x => mc(x, 4)); else if (l === 2) qs = qa.map(x => mc(x, 6)); else if (l === 3) qs = qa.map(op);
    else if (l < 6) {
      if (this.ai.ok) qs = await this.ai.gen(p.parsed_text, n, l === 4 ? 'jerarquía, nombres de temas, subtítulos y estructura del documento' : 'alta dificultad que va más allá del texto pero pertenece al tema');
      if (!qs.length) { note = 'Sin IA: usé preguntas del documento.'; qs = qa.map(op); }
    } else {
      const ex = this.ai.ok ? Math.ceil(n * .15) : 0;
      qs = qa.slice(0, n - ex).map((x, i) => i % 2 ? op(x) : mc(x, 6));
      if (ex) qs.push(...await this.ai.gen(p.parsed_text, ex, 'contexto extendido: fuera del documento pero indispensable para la materia, incluye un caso práctico')); else note = 'Sin IA: no hay preguntas de contexto extendido.';
      qs = sh(qs);
    }
    this.busy.set(''); this.run(qs, l, p.title, p.id, false, note);
  }

  run(qs: Q[], l: number, title: string, pdfId: string | null, review: boolean, note = '') {
    this.qs.set(qs); this.L = l; this.title = title; this.pdfId = pdfId; this.review = review; this.note = note;
    this.i.set(0); this.answers = []; this.txt = ''; this.strikes.set(0); this.alert.set(''); this.t0 = Date.now();
    this.left.set(l === 6 ? qs.length * 75 : 60); this.st.set('run'); clearInterval(this.tm);
    if (l >= 3) this.tm = setInterval(() => this.tick(), 1000);
    if (l === 6) this.px.start(m => this.strike(m));
  }
  tick() { this.left.update(v => v - 1); if (this.left() <= 0) this.L === 6 ? this.finish() : this.ans(); }
  strike(m: string) {
    if (this.st() !== 'run') return; this.strikes.update(v => v + 1); this.alert.set(`Infracción: ${m}. Strike ${this.strikes()}/3`);
    if (this.strikes() >= 3) this.finish();
  }
  ans(v?: string) {
    this.answers.push(v ?? this.txt); this.txt = '';
    if (this.i() + 1 < this.qs().length) { this.i.update(x => x + 1); if (this.L >= 3 && this.L < 6) this.left.set(60); } else this.finish();
  }

  async finish() {
    if (this.st() !== 'run') return; clearInterval(this.tm); this.px.stop(); this.st.set('res');
    const qs = this.qs(); while (this.answers.length < qs.length) this.answers.push('');
    const r = qs.map((q, i) => ({ ok: q.t === 'mc' ? this.answers[i] === q.a : okLocal(this.answers[i], q.a), fb: '' })); let ver = '';
    if (this.ai.ok && qs.some((q, i) => q.t === 'open' && this.answers[i].trim())) {
      try {
        const it = qs.map((q, i) => ({ i, pregunta: q.q, ideal: q.a, alumno: this.answers[i] })).filter(x => qs[x.i].t === 'open');
        const j = JSON.parse(clean(await this.ai.ask(`Evalúa semánticamente cada respuesta del alumno frente a la ideal (acepta sinónimos y paráfrasis). Devuelve SOLO JSON: {"items":[{"i":0,"ok":true,"fb":"retroalimentación breve"}],"veredicto":"${this.L === 6 ? 'informe holístico Apto/No Apto y lagunas críticas' : ''}"}\n${JSON.stringify(it)}`)));
        j.items.forEach((x: any) => { if (r[x.i]) { r[x.i].ok = !!x.ok; r[x.i].fb = x.fb || ''; } }); ver = j.veredicto || '';
      } catch { /* queda la evaluación local */ }
    }
    const c = r.filter(x => x.ok).length, w = qs.length - c, pen = this.L === 6 ? .25 : 0;
    const g = Math.max(1, Math.min(10, +(10 * (c - pen * w) / qs.length).toFixed(1))), xp = Math.round(c * 5 * Math.max(this.L, 1));
    const sec = Math.round((Date.now() - this.t0) / 1e3), apto = g >= 6 && this.strikes() < 3;
    this.res.set({ r, c, g, xp, sec, apto, ver });
    try {
      await this.api.finish({ pdf_id: this.pdfId, pdf_title: this.title, difficulty: String(this.L), total_questions: qs.length, score_average: g, time_spent_seconds: sec, xp_earned: xp, proctoring_strikes: this.strikes(), verdict_report: { apto, texto: ver } },
        qs.map((q, i) => ({ q: q.q, a: q.a, ok: r[i].ok, rid: q.rid, step: q.step })));
    } catch (e: any) { this.alert.set('No se pudo guardar el resultado: ' + e.message); }
  }
}
