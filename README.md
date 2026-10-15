# StudyAI (Angular 18 + Supabase + Gemini, PWA)

## 1. Supabase (5 min)
1. Crea un proyecto en https://supabase.com
2. SQL Editor → pega y ejecuta `supabase/schema.sql`
3. Project Settings → API: copia **Project URL** y **anon key** a `src/environments/env.ts`
4. (Opcional, para entrar sin confirmar correo) Authentication → Providers → Email → desactiva "Confirm email"
5. Authentication → URL Configuration: agrega la URL de tu sitio desplegado en "Site URL"

## 2. Local
```
npm install
npm start        # http://localhost:4200
```

## 3. Publicar (para usar desde cualquier dispositivo)
Sube la carpeta a GitHub y conéctala a **Vercel** o **Netlify** (ya traen `vercel.json` / `netlify.toml`).
Build: `npm run build` · Carpeta de salida: `dist/studyai/browser`

## 4. Instalar como app
- **iPhone/iPad**: Safari → Compartir → "Añadir a pantalla de inicio"
- **Android**: Chrome → menú ⋮ → "Instalar aplicación"
- **Windows/Mac**: Chrome o Edge → icono de instalar en la barra de direcciones

## 5. Gemini
Crea una key gratis en https://aistudio.google.com/apikey y pégala en el botón "API Gemini" de la app.
Se guarda en tu cuenta (tabla `user_profile`) y te sigue a todos tus dispositivos.
