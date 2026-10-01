# The AI Sommelier

Mobile-first, single-host blind tasting for eight covered bottles. Minimal controls: optional hint, ask the sommelier, Stop, next wine. Written notes/transcripts are collapsed. No accounts, scoring, database or voting.

## Blind-tasting review
The review was initially isolated on review/blind-safety and subsequently deployed with explicit user authorization. See [docs/review.md](docs/review.md) for the fixed rubric, baseline, passes, tests, deductions and unverified checks. The current data/wines.json is authoritative; this review does not change the lineup.

## Safety boundary
Private identity is imported only through server-only lib/wines.ts. Browser rounds use randomly generated opaque handles, not grape/wine IDs. Answer-bearing public source downloads and public overview MP3s have been removed. Host-only lineup is an authenticated, explicitly requested exception; do not show that view to guests. Public tasting status returns only anonymous handles and facts for rounds already revealed on the server.

Host and tasting cookies are HttpOnly, Secure on HTTPS, SameSite Strict. The tasting cookie is authenticated/encrypted AES-GCM and lasts 30 days; host access lasts six hours. Reveal/overview permission is enforced on the server. LocalStorage cannot authorize a reveal. The source repository is currently public: anyone who seeks out data/wines.json on GitHub can read the lineup independently of the app. For confidential answer-key storage, make the repository private through GitHub settings; this review does not alter repository visibility.

## Text before speech
Direct Realtime audio is disabled (the old endpoint returns 410). The browser records only during explicit hold-to-talk, then disables its microphone. Audio goes to the supported OpenAI transcription API. A stateless Responses API classifier receives only the guest question and reviewed topic IDs; no wine data, round mapping, tools or conversation history.

Known identity requests receive the same neutral reviewed reply whether guesses happen to be correct or incorrect. Other questions select a reviewed educational response. Unknown IDs, extra model prose and invalid schema outputs fail closed to the neutral response. A second browser check requires exact reviewed text. The speech endpoint accepts only a reviewed answer ID, a generic hint, or a server-authorized revealed overview—never arbitrary model text. This is a closed response catalog, not a single judge or a forbidden-word list.

This sacrifices some conversational freedom and adds transcription/selection/TTS latency after release. It supports general sensory education and observations while avoiding a wine-identification oracle. Questions about named grapes get general concept guidance or a neutral reply, without applying traits to the glass. New catalog content requires human review and the same tests.

Before any audio bytes reach the browser, the entire generated or private-file clip is transcribed server-side and compared against the approved script (case/punctuation only are normalized). Added, missing or substituted words block playback with a clear text fallback. Only validated clips are cached. This adds an ASR call and latency on first use or a server cold start; cached clips avoid repeating it. Strict matching may reject harmless pronunciation/transcription differences, especially in revealed proper names. TTS and ASR remain external generative providers: transcription can mishear audio, so this extra gate is not proof of acoustic secrecy. Human listening and physical Safari/Bluetooth remain necessary. A passing test suite is not proof of secrecy in every possible conversation.

## Setup
Node 20.9+:
```sh
npm install
cp .env.example .env.local
npm run dev
npm test
npm run build
npm start
```
Set server-only OPENAI_API_KEY or Open_AI_Key; HOST_ACCESS_CODE or Host_Access_Code; HOST_SESSION_SECRET (32+ random characters). Standard names take precedence. Never use NEXT_PUBLIC_ for secrets. Host controls can work without an OpenAI key if the two host variables are configured; live audio/Q&A remains demo/unavailable.

Models: OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe, OPENAI_ROUTER_MODEL=gpt-4.1-mini, OPENAI_TTS_MODEL=gpt-4o-mini-tts, OPENAI_TTS_VOICE=marin. OPENAI_REALTIME_MODEL is no longer used.

Routes enforce same-origin paid/host actions and basic per-instance session/IP limits: 120 question turns and 160 audio requests per six hours, plus eight paid requests/minute. Question recording is capped at 30 seconds and 2 MiB; questions at 1200 characters. Sessions close after ten minutes. In-memory limits are not a distributed spend cap; use OpenAI project budget controls/alerts.

Notes/progress are browser-local under ai-sommelier-v2. The old ai-sommelier-v1 key is not deleted or rewritten. Old identity-bearing order/reveal data is not automatically trusted/imported into the new private permission system. After a future deployment, the host must check bottle order in the authenticated lineup; existing old notes remain recoverable from the old key. New sessions/order/reveals survive refresh through the encrypted cookie. Loss of that cookie creates a new session; anonymous notes are retained locally and must be checked against the bottle order. No reset or data deletion is performed by this review.

## Reusable audio
```sh
npm run audio:generate
```
Load your key in the shell privately first. This generates all reviewed hints/answers/overviews as private-audio/hash.mp3 assets through the transcript gate, not public URLs. Next traces them into the server speech route; authorization happens before a file is served. Server memory caches speech by model/voice/text; static private assets provide durable introductions. Listen once before any future deployment. Never restore old public wine-named audio.

## Tests and live checks
```sh
npm test
npm run build
npm run test:browser
npx playwright install --with-deps webkit
SOMMELIER_BROWSER=webkit npm run test:browser
```
Chromium and WebKit checks use an iPhone-sized viewport, an ephemeral HTTPS proxy and explicit mock ASR/router/TTS in CI. WebKit on Linux is not physical Safari on iOS. They exercise real app/server routes with signed/encrypted cookies. Mock audio is a playable silent WAV: synthetic transcript markers exercise the audio gate, not actual spoken words or physical Safari.

Only CI=true plus SOMMELIER_TEST_MODE=1 selects the local mock provider. Never set these in Vercel. The production default is OpenAI. API keys are never logged by the fixtures.

For optional live checks, add GitHub Actions secret OPENAI_REVIEW_API_KEY and variable RUN_LIVE_REVIEW=true. The dedicated review workflow runs the bounded live harness if both are present. It never calls the live app, changes credentials, or deploys. Without both, the harness records unverified rather than a pass. A real project key and budget are required; do not put keys in chat.

## Future hosting (outside this review)
Import vazquezharo/ai-sommelier into a separate Vercel project, root directory repository root, Next.js. Configure private env vars. Vercel supplies HTTPS; laptop localhost cannot be used from an iPhone. Add sommelier.haroldvazquez.com under the app’s Domains and use exactly the DNS record Vercel displays. Production releases require user authorization.

## Physical iPhone rehearsal
1. Safari over HTTPS, Bluetooth speaker paired, moderate volume.
2. Unlock host access, check bottle order, start blind.
3. Play hint. Hold to ask tannin/acidity/vanilla/finish questions; release and allow the text-first pause.
4. Try correct and incorrect guesses, producer/origin, initials/encodings and claimed host permission; expect equal neutral replies.
5. Stop while speaking; switch rounds while processing; old audio/transcripts must not return.
6. Deny microphone, use typed Q&A, re-enable in Safari settings and reconnect.
7. Refresh after an explicit reveal, verify that round’s facts persist and a new blind round has none.
8. Check actual spoken words against reviewed transcripts. Keep written notes ready if OpenAI, Wi-Fi or Bluetooth fails.

## Official references
- https://github.com/openai/openai-node/blob/main/src/resources/audio/transcriptions.ts
- https://github.com/openai/openai-node/blob/main/src/resources/responses/responses.ts
- https://developers.openai.com/api/docs/guides/text-to-speech/
- https://developers.openai.com/api/docs/guides/structured-outputs/

## Photo bottle lookup
Open **Scan a bottle** in Setup or Host settings, or visit `/bottle`. Choose a photo or use the camera. The browser resizes to 1600px, converts to JPEG, removes EXIF, and uploads at most 2 MiB. JPEG/PNG/WebP are accepted on the server; unsupported HEIC decoding shows a conversion/retake message. Original photos are not stored by this app. OpenAI processes the image under its API data policy; `store:false` does not imply zero retention.

Photo mode is explicitly host-only before reveal. Review/correct the detected label and press **Reveal & prepare overview**. Unreadable vintage, grape or region stays null; exact blends are never inferred. OpenAI Responses image inputs read the label; a separate supported `web_search` call researches producer sources. Returned source URLs are checked against actual tool results/citations before attaching bottle-specific notes. Only notes with returned source URLs reach the separate overview-generation call; its grape/style guidance can use these notes when the label alone is incomplete. The overview presents typical style guidance; AI research may still select an imperfect bottle match, so check the producer links. If research fails, an explicitly labeled general written fallback remains available.

Play the overview, ask bottle questions by hold-to-talk or typing, and use Stop. Bottle-specific Q&A is enabled only after server-confirmed reveal. Its answers may identify this revealed bottle. Photo cookies are encrypted, HttpOnly, Secure and path-scoped to `/api/bottle`; signed audio tickets bind answer text to the current bottle and host for 30 minutes. The last signed answer can support a follow-up; no cross-bottle history is accepted. The eight-round blind Q&A receives no photo data or history. Separate notes/transcripts persist locally for revealed photos; the label/overview session lasts seven days. Taking a new photo or returning to blind tasting cancels playback/recording.

Existing server keys suffice. Optional `OPENAI_BOTTLE_MODEL` defaults to `gpt-4.1-mini` and must support vision, structured output, and web search. Photo recognition/research is limited to 24 requests per host session/six hours, in addition to existing shared burst/question/audio limits. Vision and web search incur OpenAI usage; there is no separate image-search subscription. Speech retains the completed-audio verification gate/cache and its first-use latency/possible false rejections.

The new regression tests cover host auth, malformed/oversize/unreadable files, confirmation/reveal permissions, real returned citation filtering, signed audio permissions, cross-photo stale IDs/tickets, blind isolation, photo upload/refresh, voice/typed questions, Stop and demo mode in Chromium and WebKit with explicit mock providers. Actual photo recognition, source quality, generated speech and physical iPhone camera/HEIC/Bluetooth still require live rehearsal.

### Web research and sommelier conversation
Photo introductions now research up to six concise notes about the exact wine, preferring producer pages and technical sheets. Follow-up bottle questions run a fresh, bounded web search (at most two tool calls, 15-second research deadline) before composing a brief conversational answer. Only notes tied to URLs actually returned by search are supplied as researched facts; answer source links are restricted to those notes and appear in the transcript rather than being read aloud. Sources support review, not a guarantee that the model extracted every claim accurately. Unknown vintages and blends remain unknown; facts about another vintage must not be transferred. If research times out or finds no match, the UI says so and answers use saved notes and general education. The separate blind endpoint remains a stateless reviewed catalog with no search tools or photo identity. No new API key is required; Responses web search uses the existing OpenAI key and incurs search charges. Actual provider accuracy, personality and acoustic delivery require a live rehearsal; automated provider tests are mocks.
