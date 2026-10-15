import { Injectable, signal } from '@angular/core';
import { createClient, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/env';

@Injectable({ providedIn: 'root' })
export class Sb {
  db = createClient(environment.supabaseUrl, environment.supabaseKey);
  session = signal<Session | null>(null);
  ready: Promise<void>;
  constructor() {
    this.ready = this.db.auth.getSession().then(({ data }) => { this.session.set(data.session); });
    this.db.auth.onAuthStateChange((_e, s) => this.session.set(s));
  }
  get uid() { return this.session()!.user.id; }
}
