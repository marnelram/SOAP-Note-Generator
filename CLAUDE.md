# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm**.

```bash
pnpm dev      # Run dev server at http://localhost:3000
pnpm build    # Production build
pnpm start    # Serve production build
pnpm lint     # next lint
```

There is no test suite. `next.config.mjs` sets `ignoreDuringBuilds` (ESLint) and `ignoreBuildErrors` (TypeScript), so **`pnpm build` will not catch type or lint errors** — run `pnpm lint` and `pnpm tsc --noEmit` explicitly if you need those checks.

## Environment

Requires a `.env.local` with:

```bash
OPENAI_API_KEY=...      # only used by the (currently unused) gpt-4o path in app/actions.ts
DEEPGRAM_API_KEY=...    # transcription — used by all three API routes
GROQ_API_KEY=...        # SOAP generation via @ai-sdk/groq (the active path)
```

## Architecture

Next.js 15 App Router, React 19, TypeScript, Tailwind **v4**, shadcn/ui. Single-page app (`app/page.tsx`) — a two-pane SOAP note generator: audio in on the left, generated note on the right.

### Data flow

1. **Live transcription** — `hooks/use-realtime-transcription.ts` is the core of the app. On `startRecording`, it POSTs `{action:"start"}` to `app/api/transcribe-live/route.ts`, which returns the Deepgram config **and the API key**. The browser then opens a WebSocket **directly to `wss://api.deepgram.com/v1/listen`**. The key is passed via the `Sec-WebSocket-Protocol` subprotocol (`new WebSocket(url, ["token", key])`) — **not** a URL param (browsers can't set an `Authorization` header, and Deepgram rejects the key as a query param with a 401 `INVALID_AUTH`); the model config goes on the URL as query params. The hook captures mic audio via Web Audio API (`ScriptProcessorNode`, 1024 buffer, float32→int16, 16kHz mono) and streams raw PCM. Interim results update `interimTranscript`; final results append to `transcript`. A 5s `KeepAlive` heartbeat keeps the socket open through pauses (otherwise Deepgram drops it with `NET-0001` after ~10s of silence). `onclose` owns recovery via exponential-backoff reconnect (2s/4s/8s, 3 attempts); `onerror` does not, to avoid racing two reconnects. The server route never proxies audio — it only hands out config/key and offers an `action:"validate"` health check.
2. **SOAP generation** — `app/page.tsx` calls the Vercel AI SDK `useCompletion` hook against `app/api/completion/route.ts`, which `streamText`s the transcript through **Groq `openai/gpt-oss-120b`** with a large medical-documentation system prompt. Uses `streamProtocol: "text"` on both ends. The response streams as markdown, rendered by `components/markdown.tsx` (react-markdown + remark-gfm) into `SOAPNoteDisplay`.

### Deepgram config reference

The `action:"start"` response hands the browser this config (route defaults, shallow-merged over any `options` the caller passes to `startRecording`, so callers can override per-field):

| Option             | Default          | Notes                                    |
| ------------------ | ---------------- | ---------------------------------------- |
| `model`            | `nova-3-medical` | Healthcare-terminology model             |
| `language`         | `en`             |                                          |
| `smart_format`     | `true`           | Smart formatting                         |
| `punctuate`        | `true`           |                                          |
| `interim_results`  | `true`           | Drives `interimTranscript`               |
| `utterance_end_ms` | `1000`           | Utterance-end timeout                    |
| `vad_events`       | `true`           | Voice activity detection                 |
| `endpointing`      | `300`            | Endpointing (ms)                         |
| `diarize`          | `false`          | Speaker labels — override to enable      |
| `encoding`         | `linear16`       | Must match the int16 PCM the hook sends  |
| `sample_rate`      | `16000`          | Must match the `AudioContext` sample rate|
| `channels`         | `1`              | Mono                                     |

Mic `getUserMedia` constraints: `echoCancellation`, `noiseSuppression`, `sampleRate: 16000`, `channelCount: 1`. Changing `encoding`/`sample_rate`/`channels` requires changing the client audio pipeline to match, or Deepgram returns garbage.

### Things that are misleading / not wired up

- **README is partly stale.** It claims OpenAI GPT-4 does SOAP generation; the live path actually uses **Groq**. (An older `LIVE_TRANSCRIPTION_INTEGRATION.md` doc described a `@deepgram/sdk` `LiveClient` design that was never used — the hook connects over a raw browser `WebSocket` — so it was removed and its accurate bits folded into the section below.)
- **`app/actions.ts`** (`generateSOAPNote`, OpenAI gpt-4o) and **`app/api/transcribe/route.ts`** (prerecorded file upload) exist but are **not called** by the current UI — file upload was removed to focus on realtime (see comment in `app/page.tsx`). Don't assume they're live; verify before building on them.
- **Security note:** the Deepgram API key is returned to the browser by design here. If hardening, proxy audio through the server or use Deepgram temporary keys.

### Component layout

`components/soap-note-generator/` holds the app-specific components; `index.ts` barrel-exports `InputPanel` and `SOAPNoteDisplay`. `InputPanel` (left, composes `Header` + `AudioInput` + `TranscriptEditor`) and the SOAP display resize between `w-2/5`/`w-3/5` depending on whether a note exists. On screens `< lg`, the note shows in `SOAP-drawer.tsx` (vaul drawer) instead of the right pane — `app/page.tsx` clicks `drawerRef` to open it on generate.

`components/ui/` is standard shadcn/ui. Toasts use the shadcn `use-toast` pattern (`hooks/use-toast.ts`).

## Conventions

- **Import alias:** `@/*` maps to repo root (e.g. `@/components/ui/button`, `@/hooks/use-toast`, `@/lib/utils`). `cn()` from `lib/utils.ts` for conditional classes.
- **Styling is Tailwind v4** via `@tailwindcss/postcss` — theme lives in `app/globals.css`, **not** a `tailwind.config.ts` (despite `components.json` referencing one, which doesn't exist). The `.cursor/rules/design-guide.mdc` (always-applied) documents the semantic color system: prefer shadcn components → semantic classes (`bg-card`, `text-foreground`) → direct palette colors only for special cases. All colors must work in light/dark mode.
- Client components that touch the mic/WebSocket/DOM are `"use client"`; API routes are Next route handlers under `app/api/*/route.ts`.
