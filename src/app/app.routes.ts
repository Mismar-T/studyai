import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { Sb } from './core/supabase.service';

const auth = async () => { const sb = inject(Sb); await sb.ready; return !!sb.session() || inject(Router).parseUrl('/'); };

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing').then(m => m.Landing) },
  { path: 'panel', canActivate: [auth], loadComponent: () => import('./pages/dashboard').then(m => m.Dashboard) },
  { path: 'documentos', canActivate: [auth], loadComponent: () => import('./pages/pdfs').then(m => m.Pdfs) },
  { path: 'examen', canActivate: [auth], loadComponent: () => import('./pages/exam').then(m => m.Exam) },
  { path: 'tutor', canActivate: [auth], loadComponent: () => import('./pages/tutor').then(m => m.Tutor) },
  { path: '**', redirectTo: '' }
];
