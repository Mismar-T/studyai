import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Sb } from './core/supabase.service';
import { Api } from './core/api.service';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `<header><span class="brand">StudyAI</span>
  @if (sb.session()) {
    <nav>@for (l of links; track l[0]) {<button class="g" [routerLink]="l[0]" routerLinkActive="on">{{ l[1] }}</button>}</nav>
    <button class="g" (click)="key()">API Gemini</button><button class="g" (click)="out()">Salir</button>
  }</header><main><router-outlet /></main>`
})
export class AppComponent {
  sb = inject(Sb); api = inject(Api); router = inject(Router);
  links = [['/panel', 'Inicio'], ['/documentos', 'Documentos'], ['/examen', 'Examen'], ['/tutor', 'Tutor']];
  constructor() { effect(() => { if (this.sb.session()) this.api.profile(); }); }
  async key() { const k = prompt('Tu API key de Gemini (se guarda en tu cuenta y te sigue a todos tus dispositivos):', this.api.key()); if (k !== null) await this.api.setKey(k.trim()); }
  async out() { await this.sb.db.auth.signOut(); this.router.navigateByUrl('/'); }
}
