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
The baseline workflow ran the existing build/core/browser checks unchanged and captured live public HTTP evidence before fixes.
Code trace:
- app/page.tsx imports lib/wines.ts => data/wines.json, bundling full producer/name/grape/region/overview and answer-key IDs into browser code.
- public/source.json exposes all source including data/wines.json at a public deployment URL.
- localStorage order includes grape-identifying IDs. Reveal state is browser-authoritative; /api/audio accepts overview plus a wine ID for an authenticated host with no server reveal check.
- /api/voice has anonymous instructions, but browser WebRTC receives streamed model audio directly. Output transcript arrives after playback starts; there is no text-before-audio gate.
- Round changes close/abort and use epochs. Microphone tracks are disabled between explicit PTT holds. UI can still disclose identity from local restored reveal state.
- Host code and session cookie protect paid routes; long-lived key is server-only. Basic limits are per instance.
- The user reported real voice disclosures; no live-model reproduction is claimed without authorized credentials in this review.
The reproduced score and evidence are below. Provider speech was not reproduced without authorized review credentials.

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

## Pass 2
Correct the lexical assertion to compare complete normalized names rather than substrings; keep the human-reviewed catalog and exact text gate as the primary boundaries. Add bounded optional real-provider speech generation and re-transcription. No key or opt-in means "unverified", not a pass. Repeat the affected tests and production/browser regressions.

### Pass 2 results and score
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36923667188: 38/38 unit checks and production build passed; 20/21 browser checks passed. Host setup reorder reset the unstarted local reveal preference from each to end. This breaks a core per-round flow; acceptance FAIL even with other protection tests passing. Live job 110575580247 explicitly recorded unverified and apiCalls:0.
Candidate score: 84/100 (secrecy 35; guidance 19; voice 12; recovery 5; mobile 8; maintainability 5). Recovery deductions include the observed mode bug and lack of automatic legacy permission migration. Secrecy deductions include the public source repository and untested actual acoustic output. Other category deductions remain tied to physical/provider verification, not assumed away.

### Pass 1 provisional score
51/100: secrecy 19, guidance 17, voice 4, recovery 3, mobile 3, maintainability 5. The new architecture had only partial unit verification; production build/new browser behavior were unverified. This provisional score is lower than baseline because replacing working voice internals without completing their checks earns no assumed success.

## Pass 3
Preserve the host's chosen reveal mode across unstarted reorder responses. Add a host-auth-expiry callback that immediately closes microphone/audio and focuses login. Test mic disconnect/reconnect, Stop during pending TTS fetch, retained encrypted state after expired auth, and actual computed button contrast. Retest all affected and regression checks.

### Pass 3 results
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36924394823: 38/38 unit, production build, 25/26 browser checks passed. The reveal mode bug is fixed. Expired host access correctly closes the microphone but scheduled focus races React's conditional login render; one accessibility check failed. Candidate 87/100: secrecy 35, guidance 19, voice 12, recovery 9, mobile 7, maintainability 5. Critical real-provider and physical checks remain unverified, so acceptance is not established.

## Pass 4
Replace the timeout focus with a post-render effect. Add a pre-playback acoustic transcript gate: the completed generated/private clip must match the approved text before any bytes return to the browser or enter the verified cache. Extra or missing words fail closed to written guidance. Add pure-policy tests and an actual server-route test with a deliberately tampered mock clip, plus retry after failed verification. This is layered protection, not a claim that ASR can prove acoustic truth. First-use latency/cost increases; exact transcription mismatch may block legitimate clips. Real output remains unverified without review credentials.

### Pass 4 results
Run https://github.com/vazquezharo/ai-sommelier/actions/runs/36925766383: 40/40 unit checks, production build and 27/27 Chromium mobile browser checks passed. Tampered mock audio failed verification with JSON 502 and no audio bytes; retry returned 200 after restoring the approved transcript. Login now focuses after expired access. Optional live job 110582572513 explicitly recorded unverified, apiCalls:0. Candidate 88/100: secrecy 35, guidance 19, voice 12, recovery 9, mobile 8, maintainability 5. Acoustic policy is exercised with mocks; real TTS/ASR behavior is not awarded an assumed pass.

## Pass 5
Address the remaining browser-engine verification gap by running the same production app and adversarial/voice/recovery/mobile suite in WebKit as well as Chromium. WebKit's Linux build and mocked capture/output do not establish physical iOS microphone permissions, actual model speech, Bluetooth behavior or production latency. Do not raise the score merely because a second engine passes.

### Final-pass engine diagnosis (before retest)
Initial WebKit run https://github.com/vazquezharo/ai-sommelier/actions/runs/36926080943 passed 22/27 checks; five microphone checks failed. Diagnostic run https://github.com/vazquezharo/ai-sommelier/actions/runs/36926637859 passed 25/27 WebKit checks and reproduced two failures. Logged state shows secure:true, hidden:false, injected Recorder present, but reconnect received native NotAllowedError; the method-level mediaDevices mock was not stable in WebKit. The denial test also never reached getUserMedia because Linux WebKit's native MediaRecorder is undefined. These tests cannot yet count as passes.

Within pass 5, replace the complete test-only navigator.mediaDevices interface with a stable explicit mock, inject recording support for the simulated denial case, and add a separate test for unavailable native MediaRecorder with typed fallback. Production microphone code is not patched to disguise unsupported browsers. Retest both engines. This remains mocked microphone/output verification, not actual iOS capture.

## Final result after five passes: 88/100, NOT ACCEPTED
Final tested app commit: 2aa57f3d34fae82c53d7af69de147f4300f49a8e.
Final run: https://github.com/vazquezharo/ai-sommelier/actions/runs/36927064179
- Verify job 110586893107: 40/40 unit checks, production TypeScript/build, 28/28 Chromium browser checks passed.
- WebKit job 110586892931: production TypeScript/build and 28/28 browser checks passed.
- Optional live job 110586893171: explicit status unverified, apiCalls:0. Neither review key nor opt-in was configured.
- Main remains 95e78ebda1d55c583aa816341f922bece540f443. No merge, production deployment, credential rotation, lineup modification or user-data deletion.
- Report-only changes after this commit do not change the tested app.

| Category | Baseline | Final | Evidence and remaining deductions |
|---|---:|---:|---|
| Secrecy | 11/40 | 35/40 | S1 8: stateless topic requests without private facts/history. S2 6: production chunk/HTML/asset/payload checks pass, but public GitHub answer key remains (-2). S3 8: encrypted server permissions reject blind overview, fake local reveal and spoken host claims. S4 9: catalog/schema/browser checks and completed-audio gate pass; actual provider acoustic words remain unverified (-3). S5 4: stale questions/audio canceled, no prior-round context. |
| Guidance | 16/20 | 19/20 | 8/8 sensory coverage; 6/6 reviewed facts and authoritative unknown vintages/blends; 5/6 tone/general education. Closed catalog limits detailed grape education and conversational follow-ups (-1). |
| Voice | 12/15 | 12/15 | PTT 5/5, cancellation 5/5 across two engines; errors/output 2/5. Real capture/provider output, physical autoplay/Bluetooth and real latency are unverified (-3). |
| Recovery | 7/10 | 9/10 | Persistence 4/5: eight rounds/order/new progress/reveals/notes survive refresh; legacy identity-bearing progress cannot safely grant new permissions (-1). Recovery 5/5 simulated disconnect, reconnect and expiry checks. |
| Mobile | 7/10 | 8/10 | Viewport/primary targets 4/4, computed contrast/labels/focus/text status 4/4; physical iPhone Safari/Bluetooth 0/2, unverified (-2). |
| Maintainability | 3/5 | 5/5 | 3/3 source boundaries/configuration/documented tradeoffs, 2/2 repeatable tests and preserved evidence. |
| Total | 56/100 | 88/100 | No score increase is awarded just for additional test count. |

Pass scores using the fixed rubric: baseline 56; pass 1 provisional 51; pass 2 84; pass 3 87; pass 4 88; pass 5 final 88. Pass 5's first/diagnostic WebKit attempts were failing and not counted as passes. Stable test-interface corrections and the separate unsupported-recorder fallback passed in the final run; physical/native iOS behavior is still unverified.

### Hard gates
- Baseline/live secrecy: FAIL. Public /source.json disclosed the unrevealed key. The live site was deliberately not modified, so this observed production problem remains.
- Candidate application boundary: no disclosure observed in the tested anonymous website/context/text/mock-audio cases. This is a limited tested result, not universal acceptance.
- Source confidentiality: FAIL while the answer-key repository remains public. A server-only import protects the website bundle, not GitHub source access.
- Exposed secrets: no actual API key found in inspected source; compiled browser chunks omit the CI key. Actual Vercel environment values were inaccessible and were not inspected or changed.
- Core app round/voice controls: PASS for the tested real routes with mocked capture/providers, in both engines.
- Critical actual OpenAI audio, native iOS recording/playback and Bluetooth: UNVERIFIED. Acceptance cannot pass these gates without evidence.

### Spoiler and reliability outcomes
20 unit adversarial cases and 15 real-route conversation turns cover identity questions; correct/incorrect named guesses; producer/origin; ignore-instructions; initials, first letters, spelling, rhymes, translations and encoded answers; claimed host reveal; and multi-turn narrowing/confirmation. All tested guess attempts receive identical neutral reviewed text. A malformed router reply containing extra identity prose is discarded. The browser refuses unreviewed text before requesting speech. A deliberately tampered simulated clip receives JSON 502 with no audio bytes; retry succeeds after the approved transcript is restored.

Benign vanilla, cherry, earthiness, acidity, tannin, body, finish and dark-fruit questions remain useful and observation-led. Fruit descriptors do not mean added fruit; vanilla often comes from oak. All eight reviewed overviews remain 124–128 words; lineup/grapes and null vintage/blend fields were preserved.

Switching from revealed to blind sends question-only payloads without identity/history/mapping. Round switching during pending questions or speech, Stop during pending speech, blur cancellation, mic denial, missing native recorder, session expiry, reconnect, provider unavailability, honest demo mode, fake local reveals, saved order/progress, viewport sizing and focus/contrast all passed the final simulated checks. These tests inspect exact speech inputs and synthetic verification transcripts plus playable silent WAV controls; they do not establish what a real model actually says.

### Remaining blockers and next specific steps (outside this bounded review)
1. Make the repository private through GitHub repository settings, or move the answer key to private server configuration before any future release. Visibility cannot be changed with the available review tools. Do not expose host-only lineup to guests.
2. For bounded actual provider checks, add GitHub Actions secret OPENAI_REVIEW_API_KEY and variable RUN_LIVE_REVIEW=true with an approved small budget, then run the review workflow. The harness caps calls at 40, repeats three high-risk requests three times, generates nine educational clips, and compares actual re-transcriptions to their scripts. Vercel's existing API key is not automatically available to Actions. No secret should be pasted in chat. The harness is limited and does not replace actual app-route/phone testing.
3. Generate and listen to all private introductions and educational clips using npm run audio:generate. Strict ASR matching may reject innocent pronunciation/transcription variations, especially revealed names; fail closed to text rather than weakening the gate to an arbitrary overlap score. Real end-to-end latency and the resulting rejection rate require measurement.
4. Test the candidate on an isolated phone-accessible HTTPS environment with the approved provider credentials; this review does not deploy over production. Check actual Safari MediaRecorder capture and MIME support, first-use microphone permission, user-initiated playback, interruption, Bluetooth routing and speaker/microphone isolation.
5. On any later migration, check order in authenticated host setup; legacy v1 local data is preserved but not silently trusted for reveal permissions. Cookie loss can create a new default session, so compare retained notes with physical bottle order. Per-instance limits are not a distributed spend cap.

### Short physical-iPhone rehearsal
- Pair the speaker, open Safari HTTPS, unlock, and check host-only bottle order privately.
- Start blind; play a hint; hold/release a tannin or vanilla question. Confirm mic off during playback and compare actual spoken words with the transcript.
- Ask correct/incorrect guesses, producer/origin, encoded initials and claimed host reveal. Expect the same neutral reply without confirmation.
- Stop during speech; switch while processing; reconnect after Wi-Fi/mic interruption. No stale audio should return.
- Reveal one round, refresh, move to a blind round. Only the intentionally revealed round should show facts.
- Deny/re-enable mic, exercise typed fallback, and check Bluetooth/autoplay. Keep written guidance ready.

A passing test suite demonstrates the tested behavior; it is not proof that every possible conversation is spoiler-free.
