EMDR‑Processor Manifest

A minimal, clinician‑friendly desktop/web app for bilateral visual & auditory stimulation sessions.

⸻

1. Purpose

Provide a tight‑scoped MVP that lets a clinician run configurable EMDR sets without extra fluff, so we can vibe‑code fast while keeping the blast radius small.

⸻

2. Glossary

Term	Meaning
Set	One left‑right traversal of the visual target & audio pan
Session	A series of sets, timed by total duration
Target	The moving visual cue (dot, emoji, custom SVG)
BLS	Bilateral stimulation (combined audio + visual)



⸻

3. MVP Feature Checklist
	•	Visual Stimulus
	•	Horizontal target motion (👁️‍🗨️  style) at configurable speed (bpm)
	•	Color/size presets + custom hex & px inputs
	•	Audio Stimulus
	•	Built‑in click track (generated Web Audio buffer)
	•	Upload WAV/MP3/M4A; loop & sync to sets
	•	Real‑time L↔R panning mirroring target position
	•	Session Controls
	•	Duration picker → 15‑sec steps (15 sec – 5 min)
	•	Play/Pause/Reset buttons
	•	Remaining‑time display (mm:ss)
	•	Config Persist
	•	Auto‑save last used settings to localStorage / file

⸻

4. Non‑Goals (v1)
	•	Mobile app builds
	•	Cloud sync or client data storage
	•	Clinician note‑taking

⸻

5. Tech Stack Decisions

Layer	Choice	Rationale
Runtime	Electron + Vite + React	Desktop + web parity, quick reloads
UI	TailwindCSS	Rapid styling with good access‑contrast
Audio	Web Audio API	Fine‑grained pan control, low latency
State	Zustand	Simple, boilerplate‑free global state
Testing	Vitest + Playwright	Unit + E2E for motion/audio sync



⸻

6. Directory Sketch

emdr‑processor/
├── src/
│   ├── components/
│   │   ├── Target.tsx          # moving dot
│   │   ├── Controls.tsx        # play/pause, sliders
│   │   └── DurationPicker.tsx
│   ├── hooks/useAudioEngine.ts # panning logic
│   ├── hooks/useSession.ts     # timer, set loop
│   └── App.tsx
├── public/
│   └── sounds/click.wav
├── test/ (vitest + playwright)
└── package.json



⸻

7. Config Schema (JSON)

{
  "durationSec": 120,          // multiples of 15
  "target": {
    "sizePx": 24,
    "color": "#00FF88",
    "speedPxPerSec": 300
  },
  "audio": {
    "mode": "click"|"file",
    "filePath": "optional/path",
    "volume": 0.8
  }
}



⸻

8. Acceptance Criteria
	1.	Starting a session triggers synchronized motion & panning within 50 ms drift.
	2.	Session auto‑stops when timer hits 0.
	3.	UI is operable via keyboard & meets WCAG AA contrast.
	4.	CPU steady‑state ≤15% on M1 MBA during 5‑min run.

⸻

9. Milestones

#	Deliverable	Owner	Est.	Accepts When
1	Visual engine	Dev	4 h	Dot glides end‑to‑end
2	Audio engine	Dev	4 h	Click pans L‑R
3	Session timer	Dev	2 h	Pause/Resume stable
4	Settings UI	Dev	3 h	All inputs persist
5	Packaging	Dev	2 h	.dmg / .exe autobuild



⸻

10. Backlog Ideas (Post‑MVP)
	•	Vertical & circular motion paths
	•	Dual‑monitor wide traverse
	•	Session logging CSV export
	•	OSC / MIDI trigger hook‑ins

⸻

“Done” Definition (MVP)
	•	✅ All acceptance criteria pass
	•	✅ Zero console errors at build‑time & run‑time
	•	✅ README updated with run/build instructions

⸻

Scope guard: Any new idea lives in §10 Backlog until MVP ships.