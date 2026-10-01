# Bounded blind-tasting review
Scope: baseline main commit 95e78ebda1d55c583aa816341f922bece540f443; changes only on review/blind-safety. Never merge or deploy as part of this review. The repository's current eight-wine data is authoritative.

## Fixed rubric (defined before scoring)
| Category | Concrete checks | Weight |
|---|---|---:|
| Secrecy | S1 no identity in model requests/context (8); S2 no answer key in HTML, browser chunks, public files, payload names or metadata (8); S3 authenticated server reveal/overview authorization, no spoken privilege change (8); S4 text selected/validated before speech, no arbitrary model prose reaches playback, actual acoustic verification (12); S5 stale history/output isolation (4) | 40 |
| Guidance | reviewed useful sensory hints and benign question coverage (8); accuracy/unknown vintage/blend and no actual-tasting claim (6); concise warm tone, neutral guesses, appropriate general education (6) | 20 |
| Voice | explicit PTT/mic off except hold (5); Stop, blur, round change and stale packets (5); microphone denial, network failures, playback/autoplay, actual provider audio (5) | 15 |
| Recovery | order/notes/progress/reveals survive refresh without granting reveal permission (5); disconnect/reconnect/permission and session expiry (5) | 10 |
| Mobile | primary targets fit mobile viewport and >=48px (4); keyboard labels/focus/status/contrast (4); physical iPhone Safari/Bluetooth (2) | 10 |
| Maintainability | scoped server/client boundaries and accurate setup/limitations (3); repeatable tests/evidence (2) | 5 |

Unverified critical checks earn no assumed pass. Text-input selection/mocked audio cannot establish actual provider speech or physical iPhone behavior.
Hard gates: observed unrevealed disclosure => FAIL; exposed API secrets or broken voice/round flows => FAIL; untested critical behavior => UNVERIFIED, never accepted.

## Baseline evidence
Baseline workflow will run the existing build/core/browser checks unchanged and capture live public HTTP evidence before fixes.
Code trace:
- app/page.tsx imports lib/wines.ts => data/wines.json, bundling full producer/name/grape/region/overview and answer-key IDs into browser code.
- public/source.json exposes all source including data/wines.json at a public deployment URL.
- localStorage order includes grape-identifying IDs. Reveal state is browser-authoritative; /api/audio accepts overview plus a wine ID for an authenticated host with no server reveal check.
- /api/voice has anonymous instructions, but browser WebRTC receives streamed model audio directly. Output transcript arrives after playback starts; there is no text-before-audio gate.
- Round changes close/abort and use epochs. Microphone tracks are disabled between explicit PTT holds. UI can still disclose identity from local restored reveal state.
- Host code and session cookie protect paid routes; long-lived key is server-only. Basic limits are per instance.
- The user reported real voice disclosures; no live-model reproduction is claimed without authorized credentials in this review.
Baseline score pending reproduced checks. Do not assign a passing score from mocked speech.

### Reproduced baseline (before fixes)
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36919807861 baseline job 110562738335 passed the existing 13 core tests, production build, and 20 browser tests. These tests did not catch the answer-key boundary or streamed-audio problem. Live HTTP evidence is in the baseline-evidence artifact and the baseline job log. Scores are assigned against the fixed checks, not the old test count.

Live HTTP check reproduced an unrevealed answer disclosure: GET /source.json returned 200 and the first answer-key entry (St. Francis / Pinot Noir) while /api/host returned unlocked:false. / and /api/host also returned 200. No paid API request was made. Recorded at 2026-10-01T20:12:39Z in baseline log.

### Baseline score: 56/100; acceptance FAIL
| Category | Earned | Evidence/deductions |
|---|---:|---|
| Secrecy | 11/40 | S1 8: anonymous live context/request. S2 0: public key and browser bundle. S3 0: local reveal and unguarded overview state. S4 0: raw streamed audio. S5 3: epochs/mode resets simulated, live unverified. |
| Guidance | 16/20 | 6/8 sensory coverage: identical generic hint; 6/6 reviewed unknown facts; 4/6 tone/general education: overbroad grape refusal, live behavior unverified. |
| Voice | 12/15 | 5/5 mic controls; 4/5 cancellation mocked; 3/5 errors simulated, provider/iOS output unverified. |
| Recovery | 7/10 | 4/5 browser persistence, 3/5 reconnect simulated; no authoritative private reveal recovery. |
| Mobile | 7/10 | 4/4 emulated touch targets; 3/4 keyboard/status checks incomplete; 0/2 physical Safari/Bluetooth unverified. |
| Maintainability | 3/5 | 2/3 source separation/privacy docs inaccurate; 1/2 old tests pass while missing key/audio gates. |
API-key exposure: no actual key found in repository/browser source inspected; actual Vercel env inaccessible. Live disclosure report from user remains additional evidence, not a newly reproduced paid-model result.

## Pass 1
Implemented server-only identities, opaque round handles, encrypted authoritative tasting state, authenticated lineup/reveal/overview routes, removed public source/audio, stateless ASR -> reviewed topic selection -> exact catalog text -> TTS. Direct Realtime token/audio path returns 410. Added HTTP, compiled-chunk, adversarial, microphone and stale-output checks.
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36923254688: 37/38 unit checks passed. One identity-scan assertion falsely matched the producer word "Redi" inside "ingredients". This is not an observed semantic identity disclosure. Build/browser checks did not run, so no acceptance or new passing score is assigned yet.

## Pass 2 (in progress)
Correct the lexical assertion to compare complete normalized names rather than substrings; keep the human-reviewed catalog and exact text gate as the primary boundaries. Add bounded optional real-provider speech generation and re-transcription. No key or opt-in means "unverified", not a pass. Repeat the affected tests and production/browser regressions.
