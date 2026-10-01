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
