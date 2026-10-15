import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { LV } from '../core/util';

@Component({
  selector: 'app-dashboard', standalone: true, imports: [RouterLink],
  template: `<h2>Tu panel</h2>
  <div class="stats"><div class="card stat"><b>{{ p()?.current_streak || 0 }}</b>días de racha</div><div class="card stat"><b>{{ lvl() }}</b>nivel</div>
  <div class="card stat"><b>{{ p()?.total_xp || 0 }}</b>XP</div><div class="card stat"><b>{{ avg() }}</b>promedio</div></div>
  <div class="card"><div class="bar"><i [style.width.%]="(p()?.total_xp || 0) % 100"></i></div><span class="mu">{{ (p()?.total_xp || 0) % 100 }}/100 XP para el nivel {{ lvl() + 1 }}</span></div>
  <div class="card"><h3>Repaso espaciado</h3>
  @if (due() > 0) {<p>Tienes <b>{{ due() }}</b> pregunta(s) para repasar hoy.</p><button [routerLink]="['/examen']" [queryParams]="{ review: 1 }">Repasar ahora</button>}
  @else {<p class="mu">Nada pendiente. Las preguntas falladas vuelven a las 24 h, 3 y 7 días.</p>}</div>
  <div class="card"><h3>Materias</h3>@for (s of subs(); track s.id) {<div>{{ s.name }}</div>}</div>
  <div class="card"><h3>Logros</h3>@for (b of badges(); track b[0]) {<span class="tag" [style.opacity]="b[1] ? 1 : .35">{{ b[1] ? '✓ ' : '' }}{{ b[0] }}</span>}</div>
  <div class="card"><h3>Últimos exámenes</h3>
  @for (s of ss().slice(0, 5); track s.id) {<div class="row"><b>{{ s.score_average }}</b><span>{{ s.pdf_title }} · {{ LV[+s.difficulty] }}</span></div>}
  @empty {<p class="mu">Aún no has hecho exámenes.</p>}</div>`
})
export class Dashboard {
  api = inject(Api); LV = LV; p = signal<any>(null); ss = signal<any[]>([]); due = signal(0); subs = signal<any[]>([]);
  async ngOnInit() { this.p.set(await this.api.profile()); this.ss.set(await this.api.sessions()); this.due.set((await this.api.due()).length); this.subs.set(await this.api.subjects()); }
  lvl() { return Math.floor((this.p()?.total_xp || 0) / 100) + 1; }
  avg() { const s = this.ss(); return s.length ? (s.reduce((a, x) => a + +x.score_average, 0) / s.length).toFixed(1) : '–'; }
  badges(): [string, boolean][] { const s = this.ss(), p = this.p() || {}; return [['Primer examen', s.length >= 1], ['Racha de 3 días', p.current_streak >= 3], ['Un 10 perfecto', s.some(x => +x.score_average >= 10)], ['Apto en Modo Examen', s.some(x => x.difficulty === '6' && x.verdict_report?.apto)], ['Nivel 5', this.lvl() >= 5]]; }
}
