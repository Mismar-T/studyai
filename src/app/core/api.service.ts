import { Injectable, inject, signal } from '@angular/core';
import { Sb } from './supabase.service';

const DAY = 864e5, STEPS = [1, 3, 7];
const iso = (d: Date) => d.toISOString().slice(0, 10);

@Injectable({ providedIn: 'root' })
export class Api {
  sb = inject(Sb);
  key = signal('');
  get db() { return this.sb.db; }
  async profile() { const { data } = await this.db.from('user_profile').select('*').maybeSingle(); if (data) this.key.set(data.gemini_key || ''); return data; }
  async setKey(k: string) { await this.db.from('user_profile').update({ gemini_key: k }).eq('user_id', this.sb.uid); this.key.set(k); }
  async subjects() { return (await this.db.from('subjects').select('*').order('created_at')).data || []; }
  async addSubject(name: string) { return (await this.db.from('subjects').insert({ name }).select().single()).data; }
  async pdfs() { return (await this.db.from('pdf_documents').select('id,title,subject_id,parsed_text,subjects(name)').order('created_at', { ascending: false })).data || []; }
  async addPdf(title: string, subject_id: string, text: string, topics: string[], qa: { q: string; a: string }[]) {
    const { data, error } = await this.db.from('pdf_documents').insert({ title, subject_id, parsed_text: text, extracted_structure: { topics } }).select().single();
    if (error) throw error;
    const r = await this.db.from('question_bank').insert(qa.map(x => ({ pdf_id: data.id, question_text: x.q, correct_answer: x.a })));
    if (r.error) throw r.error;
  }
  async delPdf(id: string) { await this.db.from('pdf_documents').delete().eq('id', id); }
  async qa(pdf: string) { const { data } = await this.db.from('question_bank').select('question_text,correct_answer').eq('pdf_id', pdf).eq('difficulty_level', 'base'); return (data || []).map(x => ({ q: x.question_text, a: x.correct_answer })); }
  async sessions() { return (await this.db.from('quiz_sessions').select('*').order('completed_at', { ascending: false }).limit(20)).data || []; }
  async due() { return (await this.db.from('review_items').select('*').lte('due', new Date().toISOString())).data || []; }
  async finish(s: any, rev: { q: string; a: string; ok: boolean; rid?: string; step?: number }[]) {
    await this.db.from('quiz_sessions').insert(s);
    for (const r of rev) {
      if (r.rid) {
        const step = (r.step || 0) + 1;
        if (r.ok && step > 2) await this.db.from('review_items').delete().eq('id', r.rid);
        else await this.db.from('review_items').update({ step: r.ok ? step : 0, due: new Date(Date.now() + STEPS[r.ok ? step : 0] * DAY).toISOString() }).eq('id', r.rid);
      } else if (!r.ok) {
        await this.db.from('review_items').delete().eq('question', r.q);
        await this.db.from('review_items').insert({ question: r.q, answer: r.a, due: new Date(Date.now() + DAY).toISOString(), step: 0 });
      }
    }
    const p = await this.profile(), today = iso(new Date()), yest = iso(new Date(Date.now() - DAY));
    const streak = p.last_study_date === today ? p.current_streak : p.last_study_date === yest ? p.current_streak + 1 : 1;
    await this.db.from('user_profile').update({ total_xp: p.total_xp + s.xp_earned, current_streak: streak, last_study_date: today }).eq('user_id', this.sb.uid);
  }
}
