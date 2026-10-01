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

### Pass 2 results and score
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36923667188: 38/38 unit checks and production build passed; 20/21 browser checks passed. Host setup reorder reset the unstarted local reveal preference from each to end. This breaks a core per-round flow; acceptance FAIL even with other protection tests passing. Live job 110575580247 explicitly recorded unverified and apiCalls:0.
Candidate score: 84/100 (secrecy 35; guidance 19; voice 12; recovery 5; mobile 8; maintainability 5). Recovery deductions include the observed mode bug and lack of automatic legacy permission migration. Secrecy deductions include the public source repository and untested actual acoustic output. Other category deductions remain tied to physical/provider verification, not assumed away.

### Pass 1 provisional score
51/100: secrecy 19, guidance 17, voice 4, recovery 3, mobile 3, maintainability 5. The new architecture had only partial unit verification; production build/new browser behavior were unverified. This provisional score is lower than baseline because replacing working voice internals without completing their checks earns no assumed success.

## Pass 3 (in progress)
Preserve the host's chosen reveal mode across unstarted reorder responses. Add a host-auth-expiry callback that immediately closes microphone/audio and focuses login. Test mic disconnect/reconnect, Stop during pending TTS fetch, retained encrypted state after expired auth, and actual computed button contrast. Retest all affected and regression checks.

### Pass 3 results
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36924394823: 38/38 unit, production build, 25/26 browser checks passed. The reveal mode bug is fixed. Expired host access correctly closes the microphone but scheduled focus races React's conditional login render; one accessibility check failed. Candidate 87/100: secrecy 35, guidance 19, voice 12, recovery 9, mobile 7, maintainability 5. Critical real-provider and physical checks remain unverified, so acceptance is not established.

## Pass 4
Replace the timeout focus with a post-render effect. Add a pre-playback acoustic transcript gate: the completed generated/private clip must match the approved text before any bytes return to the browser or enter the verified cache. Extra or missing words fail closed to written guidance. Add pure-policy tests and an actual server-route test with a deliberately tampered mock clip, plus retry after failed verification. This is layered protection, not a claim that ASR can prove acoustic truth. First-use latency/cost increases; exact transcription mismatch may block legitimate clips. Real output remains unverified without review credentials.

### Pass 4 results
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36925766383: 40/40 unit checks, production build and 27/27 Chromium mobile browser checks passed. Tampered mock audio failed verification with JSON 502 and no audio bytes; retry returned 200 after restoring the approved transcript. Login now focuses after expired access. Optional live job 110582572513 explicitly recorded unverified, apiCalls:0. Candidate 88/100: secrecy 35, guidance 19, voice 12, recovery 9, mobile 8, maintainability 5. Acoustic policy is exercised with mocks; real TTS/ASR behavior is not awarded an assumed pass.

## Pass 5
Address the remaining browser-engine verification gap by running the same production app and adversarial/voice/recovery/mobile suite in WebKit as well as Chromium. WebKit's Linux build and mocked capture/output do not establish physical iOS microphone permissions, actual model speech, Bluetooth behavior or production latency. Do not raise the score merely because a second engine passes.
