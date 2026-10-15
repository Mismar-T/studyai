import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Proctor {
  private last = 0; private cb?: (m: string) => void; private hs: [EventTarget, string, any][] = [];
  private fs = !!document.documentElement.requestFullscreen; // iPhone no soporta pantalla completa
  start(cb: (m: string) => void) {
    this.cb = cb; const add = (t: EventTarget, e: string, f: any) => { t.addEventListener(e, f); this.hs.push([t, e, f]); };
    add(document, 'visibilitychange', () => document.hidden && this.s('saliste de la pestaña'));
    add(window, 'blur', () => this.s('la ventana perdió el foco'));
    if (this.fs) add(document, 'fullscreenchange', () => !document.fullscreenElement && this.s('saliste de pantalla completa'));
    ['copy', 'cut', 'paste', 'contextmenu'].forEach(e => add(document, e, (x: Event) => x.preventDefault()));
    add(document, 'keydown', (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && 'ijc'.includes(k)) || ((e.ctrlKey || e.metaKey) && ['u', 'c', 'v', 'x'].includes(k)) || (e.metaKey && e.altKey && 'ij'.includes(k))) e.preventDefault(); });
    if (this.fs) document.documentElement.requestFullscreen().catch(() => { });
  }
  stop() { this.hs.forEach(([t, e, f]) => t.removeEventListener(e, f)); this.hs = []; if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); }
  private s(m: string) { if (Date.now() - this.last < 1500) return; this.last = Date.now(); this.cb?.(m); }
}
