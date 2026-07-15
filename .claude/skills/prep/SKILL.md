# Prep Skill

## Purpose

Prepare working changes for a clean commit. Reviews all files in the current git diff, tidies code, runs the type check and lint, checks a few deploy-readiness gates (conditional `pnpm build`, new env vars, Deepgram-key exposure, secret scan), updates `CLAUDE.md` / stale docs when warranted, and drafts a commit message. This is the step between "done coding" and "ready to ship."

This is a small single-page Next.js 15 app (App Router, React 19, Tailwind v4, pnpm). There is **no test suite**, no Prisma, no mobile target. Keep prep fast and proportionate.

## Workflow

### 1. Identify Changed Files

Get the list of files in the current diff (staged + unstaged + untracked):

```bash
git diff --name-only HEAD
git diff --name-only --cached
git ls-files --others --exclude-standard
```

Combine into a deduplicated list. If no changes found:

```
No changes detected. Nothing to prep.
```

### 2. Review Each Changed File

For every file in the diff, read it and check for:

**Code Tidiness:**

- Remove leftover `console.log`, `console.debug`, `console.warn` statements that are clearly debugging artifacts (preserve intentional logging in API routes, error handlers, and the reconnect/WebSocket paths in `hooks/use-realtime-transcription.ts`)
- Remove commented-out code blocks (dead code)
- Remove unused imports
- Remove any `TODO` or `FIXME` comments that were addressed by the current changes
- Remove trailing whitespace, fix inconsistent spacing

**Comment Hygiene (aggressive — this codebase uses minimal comments):**

Apply this to **comments added by the current diff**, not just pre-existing ones — newly written over-commenting is the common case. For every comment on an added/changed line, apply the **keep test**: _does it explain a "why" you cannot read off the code itself?_ If not, delete it. Default to deleting; a comment must earn its place.

**This is a required step, not a vibe — run the audit explicitly:**

1. List every comment you added: `git diff HEAD | grep -nE '^\+\s*(//|\*|#)'`. Do this even if you wrote the code this session — **especially** then. The comment you just wrote to explain your own fresh logic is the single most likely one to be redundant; you are not exempt from the keep test because you authored it.
2. Give **each** comment an explicit verdict — CUT, TRIM (to one line), or KEEP — and state the reason if KEEP. Do not skip any. Expect to CUT or TRIM the majority; a diff that keeps most of its added comments almost always failed the audit.
3. A KEEP survives only if a competent reader would **misread the code, or question a specific value/branch as a bug,** without it. "It's accurate" and "it's a why" are not enough — a true-but-obvious why is still cut.

- **Cut** (delete these):
  - Restates what the code already says (`streamProtocol: "text" // use text protocol`)
  - Narrates obvious steps ("// then append the final transcript", "// loop over results")
  - Re-explains a well-named function/variable/hook
  - Restates a pattern already documented in `CLAUDE.md` (the browser-direct Deepgram WebSocket, the Groq SOAP path, etc.) — the doc is the source; don't re-narrate it at every call site
  - **Multi-line where one line carries the point** — collapse to a single line
  - Operational/how-to detail that belongs in `CLAUDE.md` — move it there instead of inlining
  - Section-divider banners and redundant function-header blocks
- **Keep** (these earn their place):
  - A non-obvious _why_ behind a decision (e.g. `// key returned to the browser by design — see CLAUDE.md security note`)
  - A magic number / literal that would read as arbitrary (e.g. the `1024` buffer size, `16000` sample rate, or the 3-attempt reconnect backoff — one tight line)
  - A gotcha / footgun the next reader would otherwise trip on
  - A concurrency/ordering/reconnect invariant that isn't visible in the local code
  - A link to a spec/issue explaining a workaround

When a comment carries real operational value but doesn't pass the keep test, relocate it to `CLAUDE.md` (step 6) rather than deleting outright. Prefer one tight comment over a multi-line block.

**File Size Check:**

- If any changed file exceeds ~300 lines, assess whether it should be refactored (`hooks/use-realtime-transcription.ts` is the core and naturally large — don't split it just to hit a number)
- If refactoring is warranted, extract components/hooks into separate files following existing patterns (`components/soap-note-generator/`, `hooks/`) — just do it, don't ask

**Folder Size Check:**

- For each folder containing changed files, count the direct-child files
- If any folder exceeds ~10 files, assess whether it should be reorganized into subfolders by feature/concern
- Just reorganize and update all import paths (`@/*` maps to repo root) — don't ask

**Code Quality:**

- Check for obvious bugs or issues introduced by the changes
- Ensure consistent patterns with the rest of the codebase (Server vs `"use client"` split, route handlers under `app/api/*/route.ts`, `@/*` imports, `cn()` from `lib/utils.ts`, semantic Tailwind classes per `.cursor/rules/design-guide.mdc`)
- Verify no sensitive data is hardcoded (see the secret scan in step 5e)

### 3. Run Lint

```bash
pnpm lint
```

There is no separate formatter (no Prettier config in this repo) — don't invent one. Fix lint errors manually; `next lint` has no reliable `--fix` here.

Note: `next.config.mjs` sets `ignoreDuringBuilds` and `ignoreBuildErrors`, so **`pnpm build` will not surface lint or type errors** — they must be run explicitly (this step and the next).

### 4. Run Type Check

```bash
pnpm tsc --noEmit
```

Fix every type error reported, including pre-existing ones outside the current diff — the repo should leave `/prep` with a clean `tsc --noEmit`. Exceptions:

- If a fix is non-trivial (architectural change, ambiguous intent, large blast radius, or would require functional changes beyond a typing fix), flag it to the user with a one-line summary instead of guessing.
- If an error is in generated code (`.next/`, `node_modules/`), skip it.

### 5. Deploy-Readiness Gates

`tsc --noEmit` and lint prove the code is _tidy and type-clean_ — not that it builds for production or that its config is deploy-safe. These gates close that gap. **All checks here REPORT for review — never silently commit around a flagged issue.**

#### 5a. Production build (conditional)

`tsc --noEmit` does **not** catch what a Next.js production build catches: Server/Client boundary violations, `useSearchParams` without a Suspense boundary, route-handler signature/export errors, build-time `process.env` access, and static-generation failures.

Run the full build **only when the diff touches build-sensitive files** — otherwise `tsc` + lint are sufficient and the build is skipped to keep `/prep` fast. Build-sensitive = any of:

- `app/**` pages, layouts, or `route.ts` handlers
- `next.config.mjs`, `middleware.ts`, `app/globals.css`, `postcss.config.mjs`
- `package.json` dependency changes

```bash
pnpm build
```

Fix any build errors before continuing. (Remember `ignoreBuildErrors`/`ignoreDuringBuilds` means the build tolerates type/lint errors — it will still fail on the boundary/route/static issues above.)

#### 5b. New env vars (flag only)

Grep the diff for newly-introduced `process.env.X` references. The known keys are `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `GROQ_API_KEY` (see `CLAUDE.md` → Environment). For each **new** one, flag that it must be:

- added to `.env.local` locally, **and**
- set in the deploy environment (it will silently break prod if it only lives in local `.env.local`), **and**
- documented in the `CLAUDE.md` Environment section.

#### 5c. Deepgram key exposure guard

By design, `app/api/transcribe-live/route.ts` returns the `DEEPGRAM_API_KEY` to the browser so the client can open a WebSocket directly to `wss://api.deepgram.com`. If the diff changes that route or the transcription hook, confirm the change doesn't **widen** key exposure (e.g. logging the key, returning it on the `validate` path, embedding it in a committed file). If hardening is intended, the right fix is proxying audio server-side or using Deepgram temporary keys — flag that to the user rather than assuming.

#### 5d. Secret scan

Grep the diff for hardcoded secret shapes in **added** lines:

```bash
git diff HEAD | grep -nE 'sk-[A-Za-z0-9]{20,}|sk_live_|sk_test_|gsk_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.'
```

(`gsk_` = Groq, `sk-` = OpenAI.) Any hit in added lines → stop and flag to the user before committing. The Deepgram key returned by the live route is expected server-side config, not a hardcoded literal — don't confuse the two.

### 6. Update Docs

Check whether the changes warrant doc updates:

- **`CLAUDE.md` (root)** — the primary source of truth. Update when: new API routes added → the Data flow / architecture section; new env vars → Environment section; the transcription or SOAP-generation pipeline changed; new components/conventions.
- **`README.md`** and **`LIVE_TRANSCRIPTION_INTEGRATION.md`** — these are **known to be partly stale** (README claims OpenAI does SOAP generation; the live path uses Groq. The integration doc describes a `@deepgram/sdk` `LiveClient` design, but the hook uses a raw browser `WebSocket`). If your change touches an area a stale doc describes, fix the doc while you're there. Otherwise don't rewrite them wholesale during prep.

**Don't update docs when:** changes are purely internal refactors, bug fixes that don't change documented behavior, or minor tweaks.

Read the relevant file before editing. Keep updates concise and consistent with existing style.

### 7. Final Review

```bash
git diff --stat
```

Review the complete set of changes (including cleanup from steps 2–6) to ensure everything is coherent and nothing was accidentally broken.

### 8. Draft Commit Message

Analyze all changes and draft a commit message.

**Format** (follow existing conventions from `git log` — this repo uses short lowercase-ish imperative subjects, e.g. "added drawer for mobile"):

```
{concise summary of what changed}

{Optional body: additional context if changes are complex}
```

**Guidelines:**

- Keep the subject line under 72 characters
- Use imperative mood ("add" not "added") unless matching the repo's existing past-tense style is clearly preferred
- Focus on the "why" not the "what"
- If changes span multiple concerns, suggest splitting into multiple commits

Present the draft to the user:

```
Prep complete! Here's what was done:

Changes reviewed: {N} files
- {summary of cleanup performed}
- Comment audit: {X} added comments reviewed → {C} cut, {T} trimmed, {K} kept
- {summary of any refactoring}
- {lint result}
- {type check result}
- {production build result, or "build skipped — no build-sensitive files"}
- {deploy-readiness flags: new env vars, Deepgram-key exposure, secret hits — or "none"}
- {doc updates made, if any}

Suggested commit message:
---
{commit message}
---

Ready to commit? Review the diff and commit manually.
```

## Tools Required

### File Operations

- `Read` — Read changed files for review
- `Edit` — Apply code cleanup and fixes
- `Write` — Create new files (only if refactoring requires splitting)
- `Glob` — Find related files
- `Grep` — Search for patterns (console.logs, unused imports, `process.env`, secrets)

### Shell

- `Bash` — Git commands, lint, type check, build

### User Interaction

- `AskUserQuestion` — Confirm major refactors before executing

## Input

None (skill invoked by user via `/prep`)

Optional argument: specific files to prep (otherwise uses full git diff)

```
/prep                     # Prep all changed files
/prep components/         # Prep only changes in components
```

## Output

- All changed files reviewed and cleaned
- Lint issues fixed
- All type errors resolved (in-diff + pre-existing), or non-trivial ones flagged
- Production build run when build-sensitive files changed (else skipped)
- Deploy-readiness gates run: new env vars, Deepgram-key exposure, secret scan — surfaced for review, not auto-edited
- Relevant docs (`CLAUDE.md`, and stale `README.md` / `LIVE_TRANSCRIPTION_INTEGRATION.md` where touched) updated
- Draft commit message presented

## Error Handling

**Lint Errors**:

```
Found lint errors that need manual attention:
{error details}
Fixing...
```

Then fix them manually via Edit.

**Pre-existing Type Errors**:

Fix them as part of prep — `/prep` should land with a clean `tsc --noEmit`. Report what was fixed:

```
Fixed {N} pre-existing type errors:
- {file}: {one-line description of the fix}
```

If a fix would balloon (architectural change, ambiguous intent, or requires functional logic changes beyond typing), flag it instead of guessing.

**Large Refactor Needed**:

```
{filename} is {N} lines. Would you like to refactor it?
```

Use AskUserQuestion to confirm before splitting files.

## Important Notes

**DO:**

- Focus cleanup work on files in the git diff
- Fix pre-existing type/lint errors surfaced by the check steps — even outside the diff
- Preserve intentional logging (error handlers, API routes, reconnect/WebSocket paths)
- Read files before editing them
- Keep doc updates concise and matching existing style
- Present the commit message as a suggestion, not auto-commit

**DON'T:**

- Modify files outside the git diff for reasons other than fixing errors surfaced by check steps
- Remove logging that serves a real purpose
- Auto-commit
- Make functional changes beyond cleanup — if you spot a bug, flag it but don't fix it unless it's in the current diff
- Add new comments, docstrings, or type annotations to code you didn't change (typing fixes are fine)
- Invent tooling this repo doesn't have (Prettier, a test runner, Prisma migrations, a mobile mirror)
- Widen Deepgram key exposure or hardcode any secret
