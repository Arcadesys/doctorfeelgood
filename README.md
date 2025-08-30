# EMDR Processor (MVP foundation)

A minimal, clinician‑friendly web app for bilateral visual and auditory stimulation sessions. This is a lightweight, web‑only foundation aligned with `src/components/manifest.md`:

- React + Vite (TypeScript)
- Web Audio API for panning and click generation
- No global state library (kept simple for mvp)
- LocalStorage persistence for settings

## Quick start

1. Install Node.js 20 LTS (use `nvm use` to load `.nvmrc`).
2. Install deps:
   - `npm install`
3. Run dev server:
   - `npm run dev`
4. Build for production:
   - `npm run build`
   - `npm run preview` to locally preview the build

## Project layout

- `index.html` – single page shell
- `src/App.tsx` – composition and session timer
- `src/components/Target.tsx` – horizontal moving dot with rAF
- `src/components/Controls.tsx` – play/pause/reset and settings
- `src/components/DurationPicker.tsx` – 15s steps selector
- `src/hooks/useAudioEngine.ts` – Web Audio panner + click
- `src/lib/storage.ts` – localStorage helpers
- `src/types.ts` – config schema

## Notes on behavior

- Visual target moves left↔right at a constant speed with edge detection.
- Audio panning mirrors target position continuously.
- A short “click” is played on each edge when audio mode is `click`.
- Session auto‑stops at 0; play/pause toggles; reset restores remaining time.
- Settings (duration, speed, size, color, volume) persist locally.

## Supabase hosting

This app is a static SPA. Supabase is ideal for the backend (Auth, Postgres, Storage, Edge Functions). For hosting the static site, you have two simple paths:

- Recommended: Deploy the static bundle (`dist/`) on a static host (e.g., Netlify, Vercel, Cloudflare Pages) and connect to Supabase for backend needs when you add them. This keeps the app ultra‑light with a global CDN.
- Supabase‑only option: Serve the static build via an Edge Function (Deno). This works for small apps but isn’t as cost/perf optimal as a CDN. If you prefer this route, I can add a `supabase/functions/www` function that serves `dist/` using Hono’s `serveStatic` middleware.

If you want to integrate Supabase soon (auth, Storage uploads for audio files, etc.), run:

```
npm i @supabase/supabase-js
```

Then create `src/supabaseClient.ts`:

```
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
);
```

And add `.env` vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Accessibility and performance

- Keyboard operable controls, status time uses `aria-live`.
- Dot movement uses `transform` for smooth, GPU‑friendly updates.
- Audio graph is created lazily and kept minimal (oscillator click).

## Next steps

- Add audio file upload + loop (local first, optional Supabase Storage later)
- Tests with Vitest + Playwright for motion/audio sync
- Optional: TailwindCSS for faster styling iteration
