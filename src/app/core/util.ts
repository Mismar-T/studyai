export type Q = { t: 'mc' | 'open'; q: string; a: string; o?: string[]; rid?: string; step?: number };
export const LV = ['Repaso', 'Fácil', 'Medio', 'Difícil', 'Avanzado', 'Complejo', 'Modo Examen'];
export const sh = <T>(a: T[]) => [...a].sort(() => Math.random() - .5);
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');
export const fmt = (s: number) => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export const clean = (s: string) => s.replace(/```json|```/g, '').trim();
export const okLocal = (a: string, r: string) => {
  const w = [...new Set(norm(r).split(' ').filter(x => x.length > 3))], t = norm(a);
  return w.length ? w.filter(x => t.includes(x)).length / w.length >= .5 : false;
};
export function parseLines(t: string) {
  const L = t.split('\n').map(x => x.trim()).filter(Boolean), o: { q: string; a: string }[] = [];
  if (L.filter(l => l.includes('|')).length > L.length / 2) L.forEach(l => { const [p, ...r] = l.split('|'); if (r.length) o.push({ q: p.trim(), a: r.join('|').trim() }); });
  else for (let i = 0; i + 1 < L.length; i += 2) o.push({ q: L[i], a: L[i + 1] });
  return o;
}
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf';
async function loadPdfjs(): Promise<any> {
  const w = window as any;
  if (!w.pdfjsLib) await new Promise<void>((ok, ko) => { const s = document.createElement('script'); s.src = PDFJS + '.min.js'; s.onload = () => ok(); s.onerror = () => ko(new Error('No se pudo cargar pdf.js (¿sin internet?)')); document.head.appendChild(s); });
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + '.worker.min.js';
  return w.pdfjsLib;
}
export async function readPdf(f: File) {
  const lib = await loadPdfjs(), d = await lib.getDocument({ data: await f.arrayBuffer() }).promise; let t = '';
  for (let i = 1; i <= d.numPages; i++) {
    const c = await (await d.getPage(i)).getTextContent(); let y: number | null = null, l = '';
    for (const it of c.items as any[]) { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2) { t += l.trim() + '\n'; l = ''; } l += it.str + ' '; y = yy; }
    t += l.trim() + '\n';
  }
  return t;
}
