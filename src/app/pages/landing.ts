import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Sb } from '../core/supabase.service';

@Component({
  selector: 'app-landing', standalone: true, imports: [FormsModule],
  template: `<section class="hero"><h1>Estudia con tus propios apuntes</h1>
  <p>Sube un PDF, genera exámenes de seis niveles, practica con un tutor que te hace pensar y repasa justo cuando ibas a olvidar. Tu progreso te sigue en el celular, la tablet y la computadora.</p></section>
  <div class="card" style="max-width:380px"><h3>Entrar o crear cuenta</h3>
  <div class="row"><input type="email" placeholder="Correo" [(ngModel)]="email" autocomplete="email" style="width:100%"></div>
  <div class="row"><input type="password" placeholder="Contraseña (mín. 6)" [(ngModel)]="pass" autocomplete="current-password" style="width:100%"></div>
  <div class="row"><button (click)="go(false)">Entrar</button><button class="g" (click)="go(true)">Crear cuenta</button></div>
  @if (msg()) {<p class="mu">{{ msg() }}</p>}</div>`
})
export class Landing {
  sb = inject(Sb); router = inject(Router); email = ''; pass = ''; msg = signal('');
  async ngOnInit() { await this.sb.ready; if (this.sb.session()) this.router.navigateByUrl('/panel'); }
  async go(up: boolean) {
    const c = { email: this.email, password: this.pass };
    const { data, error } = up ? await this.sb.db.auth.signUp(c) : await this.sb.db.auth.signInWithPassword(c);
    if (error) this.msg.set(error.message);
    else if (!data.session) this.msg.set('Revisa tu correo para confirmar la cuenta y luego entra.');
    else this.router.navigateByUrl('/panel');
  }
}
