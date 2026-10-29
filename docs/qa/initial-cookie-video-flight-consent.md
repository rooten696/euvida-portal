# Initial cookie consent: videos and flights

## Behaviour

- Initial dialog explicitly discloses YouTube and Kiwi.com / Travelpayouts in cs/en/de/fr/es.
- Accept all saves analytics, partner/flight and separate video grants. Allowed players/widgets load without a second consent click; videos never autoplay.
- Customize provides three independent, initially unselected choices. Reject optional denies all three. Cookie settings remain available.
- Legacy analytics/partner choices remain unchanged. Missing `cookie_video_consent` never grants video access and causes one renewed initial decision for the new purpose.
- Video grants react to both consent events and cross-tab storage changes. Revocation unmounts the provider iframe. Partial/blocked persistence fails closed, including the third storage write.
- No DB/content/affiliate tracking changes, dependencies or vendor snippet changes.

## Verification

- `npm test`: 231 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed (production build including static generation).
- `git diff --check`: passed.
- Scoped ESLint for all six changed source/test files: passed.
- Added-lines scan for embedded secrets and dangerous execution patterns: passed.

### Real browser on the local production build

Started with `npm run start -- --hostname 127.0.0.1 --port 4127`.

1. Fresh `/cs/article/szczyrk-enduro-trails-by-trek`: three absent storage decisions, zero YouTube iframe and zero YouTube/ytimg/googlevideo resources.
2. Clicked the initial Accept all: all three decisions became `granted`; the YouTube iframe appeared without clicking the video placeholder. URL had no autoplay parameter and iframe permissions excluded autoplay.
3. Navigated to `/cs/letenky` using the same decision: no open cookie dialog, no extra flight-consent button; actual tpwgt.com and widgets.kiwi.com resources loaded.
4. Reopened settings and rejected optional: all three decisions became `denied`, flight script and all iframes disappeared.
5. Reloaded `/cs/letenky`: no third-party flight/video resources or iframes; no repeated dialog after the current complete denial.
6. Returned to the article with denial: player placeholder remained. Its cookie-settings button opened the common customized dialog with three unchecked choices.
7. Granted only videos and saved: YouTube iframe appeared while marketing and analytics remained `denied`; no analytics/flight resource requests were observed on that page.
8. Visually checked customized dialog: readable disclosures and three choices; green Accept all left, Reject optional right.

This initial QA verifies a local production build. Independent read-only review passed with no blocking findings. Roman subsequently explicitly approved merge/deployment in Telegram (“Nasaď to, dík.”); verify deployed production separately.

Existing limitations: Kiwi's current gate does not observe cross-tab storage events. If storage writes and removals both fail, fail-closed revocation is guaranteed only in the current document, not persistently after reload.
