# AGENTS.md — EMDR React App

> Status: **prototype**. UI is still janky.
> Goal: ship small, safe improvements without accidentally building a medical device.

## What this repo is
A React web app that provides bilateral stimulation (BLS) for EMDR-style sessions.
It supports:
- **Visual** stimulation (moving icon / dot).
- **Auditory** stimulation (left/right panning beeps or clicks).

This app is a **tool**. It is **not** clinical advice, diagnosis, or treatment.
Do not market it as a medical device. Do not store PHI (Protected Health Information).

## Core product principles
1. **Comfort first.** Make the stimulus adjustable and non-startling.
2. **Predictability beats cleverness.** Defaults should feel calm and “safe.”
3. **No data hoarding.** Prefer local-only state. Avoid accounts and cloud.
4. **Accessibility matters.** Keyboard control, reduced motion, volume safety.
5. **Failure should be boring.** If audio fails, show a clear message and keep visual working.

## Architecture sketch
- `src/app/` or `src/pages/` — route-level UI.
- `src/components/` — UI components (controls, stage, settings panel).
- `src/engine/` — stimulation engines:
  - `visualEngine` (position, speed, direction, pause/resume)
  - `audioEngine` (WebAudio: oscillator/buffer + stereo panner)
- `src/state/` — session state (React context or Zustand).
- `src/types/` — shared types.
- `src/utils/` — helpers (clamp, debounce, persisted settings).

### State rules
- Keep “live session state” in memory.
- Persist only **comfort preferences** (e.g., volume, tone, icon choice) in `localStorage`.
- Never persist names, notes, or anything client-identifying.

## Coding conventions (agents must follow)
- Use TypeScript for new files.
- Keep functions small. Prefer pure functions in `engine/`.
- Clamp all user-entered numeric values.
- Put defaults in one place (e.g., `src/config/defaults.ts`).
- Never autoplay audio on load. Require a user gesture to start audio (browser policy).
- Add a “panic stop” hotkey: `Space` toggles pause, `Esc` stops.

## UX constraints (yes, even when janky)
- Provide **Start / Pause / Stop** controls that always work.
- Show “Audio enabled/disabled” status and explain why if disabled.
- Keep controls usable on small screens.
- Respect `prefers-reduced-motion` by offering a reduced-motion mode.

## Safety + comfort guardrails
- Volume slider starts low (e.g., 10–20%).
- Limit max volume (soft cap + warning near max).
- Offer “soft” waveforms (sine) and non-sharp click options.
- Avoid flashing. Avoid high-contrast strobe effects.
- Provide quick “mute audio” button.

## Testing expectations
Minimum:
- Unit tests for clamp/range logic and settings serialization.
- A basic engine test that start/pause/stop does not throw.
- Manual checklist before merge:
  - Start visual only
  - Start audio only
  - Start both
  - Pause/resume
  - Stop resets cleanly
  - Refresh keeps comfort settings but not session state

## Work style for agents
- Prefer **small PRs**: one behavior change per PR.
- Write short commit messages: `feat:`, `fix:`, `chore:`.
- When unsure, choose the option that reduces scope.
- Call out shiny-object territory explicitly.

---

## Backlog (next)
Warning: UI is still janky as fuck.

| Story | Effort |
|---|---|
| As a therapist, I want to be able to customize the auditory stimulation so that my client feels comfortable. | Small |
| As a client, I want to choose the icon used for my EMDR session so that I feel comfortable in that moment. | Medium |
| As a therapist, I want to be able to sync my session with a client so that I can begin and end the stimulation remotely. | Large |

### Story 1 — Customize auditory stimulation (Small)
**Intent:** comfort + control.

**Suggested settings**
- Volume (0–100 with max cap)
- Tempo (beats/clicks per minute)
- Tone type: `sine | triangle | click`
- Pitch (Hz) or “low/medium/high”
- Pan depth (how far L/R)
- Optional fade-in (ms)

**Acceptance criteria**
- User can adjust volume and tempo during playback without glitches.
- App clamps values and never throws on weird input.
- Audio requires user gesture to start.
- “Mute” works instantly.

### Story 2 — Choose icon for visual stimulus (Medium)
**Intent:** reduce discomfort and increase agency.

**Approach**
- Provide a small icon picker (a few calm defaults).
- Allow upload only if you can guarantee local-only usage (no server).
- Persist selection locally.

**Acceptance criteria**
- User can pick an icon and see it used immediately.
- Icon choice persists across refresh.
- App provides at least 6 built-in icons with accessible labels.
- Reduced-motion mode still works.

### Story 3 — Therapist-client sync (Large)
**Intent:** therapist can remotely start/stop client stimulus.

**Reality check**
This touches networking, identity, security, privacy, and failure modes.
Do not start until Stories 1–2 feel solid.

**Recommended phase plan**
1. **Local pairing prototype** (same device): “therapist view” controls “client view.”
2. **LAN pairing** (WebRTC data channel or websocket): short-lived session code.
3. **Hardening**: encryption, replay protection, abuse resistance, no PHI.

**Acceptance criteria (phase 1)**
- Therapist start/pause/stop mirrors client state within 250ms on same device.
- Client can always override with local Stop.
- No persistent accounts. No stored session history.

---

## Definition of Done (for any change)
- Works in Chrome + Safari (latest).
- Does not regress Start/Pause/Stop.
- Does not add any PHI collection.
- Includes a brief note in `CHANGELOG.md` (optional but nice).