import { Injectable, inject } from '@angular/core';
import { Api } from './api.service';
import { Q, clean } from './util';

@Injectable({ providedIn: 'root' })
export class Gemini {
  api = inject(Api);
  model = 'gemini-3.8-flash'; 
  get ok() { return !!this.api.key(); }
  async call(contents: any[], o: { json?: boolean; sys?: string } = {}): Promise<string> {
    if (!this.ok) throw new Error('Falta la API key de Gemini (botón "API Gemini")');
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.api.key() },
      body: JSON.stringify({ contents, systemInstruction: o.sys ? { parts: [{ text: o.sys }] } : undefined, generationConfig: o.json ? { responseMimeType: 'application/json' } : {} })
    });
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'Error de la API');
    return j.candidates[0].content.parts[0].text;
  }
  ask(p: string, json = true) { return this.call([{ role: 'user', parts: [{ text: p }] }], { json }); }
  // Lotes de 5 para que el JSON no se corte (límite de salida)
  async gen(text: string, n: number, focus: string): Promise<Q[]> {
    const out: Q[] = [];
    while (out.length < n) {
      const k = Math.min(5, n - out.length);
      try {
        const r = JSON.parse(clean(await this.ask(`Texto de estudio:\n${text.slice(0, 20000)}\n\nGenera ${k} preguntas de respuesta abierta. Enfoque: ${focus}. No repitas: ${out.map(x => x.q).join(' / ').slice(0, 800)}. Devuelve SOLO JSON: [{"q":"","a":"respuesta ideal"}]`)));
        if (!r.length) break; out.push(...r.map((x: any) => ({ t: 'open' as const, q: x.q, a: x.a })));
      } catch { break; }
    }
    return out;
  }
}
