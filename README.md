# SOAP Note Generator

A medical documentation assistant that turns a live patient encounter into a structured **SOAP note**. Speech is transcribed in real time with **Deepgram Nova-3-Medical**, and the transcript is converted to a formatted SOAP note by an LLM streamed through the **Vercel AI SDK**.

## How it works

The app is a single two-pane page ([app/page.tsx](app/page.tsx)): audio input on the left, generated note on the right (a drawer on mobile).

1. **Live transcription** — Click record and the browser captures your mic and opens a WebSocket **directly to Deepgram**, streaming raw PCM audio. Interim words appear as you speak; finalized text is appended to the editable transcript.
2. **SOAP generation** — The transcript is sent to a server route that streams it through an LLM with a medical-documentation system prompt. The note streams back as markdown and renders live.

```
mic ──▶ browser (Web Audio) ──WebSocket──▶ Deepgram Nova-3-Medical
                                                    │
                                            live transcript
                                                    │
transcript ──▶ /api/completion ──▶ Groq LLM ──stream──▶ SOAP note (markdown)
```

## Technology Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS **v4** (theme in `app/globals.css` — there is no `tailwind.config.ts`), shadcn/ui + Radix primitives
- **Speech-to-Text**: Deepgram Nova-3-Medical (`@deepgram/sdk`)
- **LLM / streaming**: Vercel AI SDK (`ai`, `@ai-sdk/*`); SOAP generation currently runs on **Groq** (`openai/gpt-oss-120b`)
- **Package manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ and **pnpm**
- A [Deepgram API key](https://console.deepgram.com/signup) (transcription)
- A [Groq API key](https://console.groq.com/keys) (SOAP generation — the active LLM path)

### Environment Variables

Create a `.env.local` in the project root:

```bash
# Required — Deepgram speech-to-text (live + file transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Required — Groq powers the active SOAP-note generation path (/api/completion)
GROQ_API_KEY=your_groq_api_key_here

# Optional — only used by app/actions.ts (gpt-4o), which is not wired into the UI
OPENAI_API_KEY=your_openai_api_key_here
```

### Install & run

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`.

> **Note:** `next.config.mjs` sets `ignoreBuildErrors` and `ignoreDuringBuilds`, so **`pnpm build` does not fail on TypeScript or ESLint errors**. Run `pnpm lint` and `pnpm tsc --noEmit` explicitly if you want those checks in CI or locally.

## Usage

1. Click **Start Recording** and speak the patient encounter. Grant microphone permission when prompted.
2. Watch the transcript fill in live. Click **Stop** when done and edit the transcript if needed.
3. Click **Generate SOAP Note**. The structured note streams into the right pane (or the drawer on mobile), where you can copy or export it.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── transcribe-live/route.ts  # Hands the client Deepgram config + key for the live WebSocket
│   │   ├── completion/route.ts       # Streams the SOAP note from the Groq LLM  ← active generation path
│   │   └── transcribe/route.ts       # Prerecorded file upload (NOT wired into the current UI)
│   ├── actions.ts                    # generateSOAPNote via OpenAI gpt-4o (NOT wired into the current UI)
│   ├── page.tsx                      # Main two-pane page; owns app state
│   └── globals.css                   # Tailwind v4 theme / design tokens
├── components/
│   ├── soap-note-generator/          # App-specific UI (Header, AudioInput, TranscriptEditor,
│   │   │                             #   InputPanel, SOAPNoteDisplay, SOAP-drawer); index.ts barrel
│   ├── ui/                           # shadcn/ui components
│   └── markdown.tsx                  # react-markdown + remark-gfm renderer
├── hooks/
│   ├── use-realtime-transcription.ts # ★ Core: mic capture + Deepgram WebSocket + transcript state
│   └── use-toast.ts                  # shadcn toast
└── lib/utils.ts                      # cn() and helpers
```

The single most important file to understand is [hooks/use-realtime-transcription.ts](hooks/use-realtime-transcription.ts) — it manages microphone capture (Web Audio API, float32→int16 at 16 kHz mono), the direct Deepgram WebSocket, interim-vs-final transcript handling, and exponential-backoff reconnection.

## Conventions

- **Import alias:** `@/*` maps to the repo root (e.g. `@/components/ui/button`, `@/lib/utils`).
- **Styling:** Prefer shadcn components, then semantic Tailwind classes (`bg-card`, `text-foreground`), and only then direct palette colors. Everything must work in light and dark mode. See [.cursor/rules/design-guide.mdc](.cursor/rules/design-guide.mdc) for the full design system.
- **Client vs server:** Components touching the mic/WebSocket/DOM are `"use client"`; backend logic lives in `app/api/*/route.ts` route handlers.

## Gotchas for new developers

- **The README used to claim OpenAI GPT-4 does generation — it doesn't.** The live path uses **Groq** (`/api/completion`). The OpenAI and file-upload code paths (`app/actions.ts`, `app/api/transcribe/route.ts`) exist but are **not** called by the current UI; file upload was removed to focus on realtime. Verify before building on them.
- **The Deepgram API key is sent to the browser** so it can open the WebSocket directly. This is fine for local/dev but should be hardened (server-side proxy or Deepgram temporary keys) before any production/HIPAA use.
- No audio is stored server-side; transcripts are processed in memory.

## Security & Compliance

- Audio is processed via Deepgram's API and not persisted by this app.
- HIPAA-compliant infrastructure is available through Deepgram, but note the API-key exposure gotcha above before treating this app as production-ready.

## License

MIT License — see LICENSE file for details.
