# OrbitSchool — Play Store readiness checklist

## Current build status
This folder contains an enhanced browser/PWA project. It does **not** contain a signed Android App Bundle (AAB), a production authentication system, cloud sync, server-side reward ledger, online multiplayer, or fully reviewed global curriculum. Do not describe it as Play Store-ready yet.

## Current Google Play checkpoints (checked 22 November 2026)
- New Android apps and updates submitted on Google Play must target Android 16 / API level 36 or higher from 31 August 2026. Verify the current Play Console notice at submission time: https://support.google.com/googleplay/android-developer/answer/11926878
- New personal developer accounts created after 13 November 2023 need a closed test with at least 12 opted-in testers continuously for 14 days before applying for production access: https://support.google.com/googleplay/android-developer/answer/14151465
- A Play Console developer-account owner must be at least 18 and complete identity verification: https://support.google.com/googleplay/android-developer/answer/6112435
- Every app needs a privacy policy and accurate Data Safety disclosures. Apps that offer account creation must provide in-app and web account-deletion requests: https://support.google.com/googleplay/android-developer/answer/10144311
- AI-generated-content apps need an in-app way for users to report or flag offensive AI output: https://support.google.com/googleplay/android-developer/answer/13985936

## Before a production submission
- Choose and validate the Android packaging route (for example, Capacitor or Trusted Web Activity) and produce a signed release AAB targeting API 36 or later.
- Test installation, updates, back navigation, orientation, keyboard, touch, WebGL fallback, offline behavior and crash recovery on real Android devices.
- Replace or bundle external CDN dependencies for a stable production build; review third-party licences and security updates.
- Implement real authentication only if account features are offered; otherwise clearly label profiles as local/guest.
- Add privacy policy, in-app data controls, account deletion where account creation is offered, and accurate Data Safety disclosures.
- Add authentication and per-user/per-device rate limits to the AI endpoint; validate uploads and reduce request sizes safely.
- Add AI content reporting and a documented moderation/response process. Google Play specifically requires in-app reporting/flagging for offensive AI-generated content.
- Verify target audience, Families requirements where applicable, ads policy, permissions, content rating and child-safety design.
- Ensure all social, chat, leaderboard and multiplayer claims match what is genuinely implemented.
- Verify rights and permissions for all bundled school materials and identifiable photos before public distribution.
- Create store listing copy, screenshots, icon, feature graphic, support contact, release notes and testing plan.
- Complete required internal/closed testing and policy declarations for the developer account type. For qualifying new personal accounts, plan for 12 testers opted in continuously for 14 days.

## Known limitations in this build
- Orbit World is an explorable first-pass hub with six themed destination variations; it is not a complete large open-world game.
- Avatar Studio currently provides a procedural cute block avatar, a small palette and headwear selection; full clothing/rig editing is a later phase.
- The 60-achievement catalogue uses distinct icon designs and five rarity tiers. Metrics are connected to focus completions, flashcard reviews, quiz answers, task completion, world visits, boss wins and arcade results. Some niche milestones still need fuller event integration and may remain locked until those events are added.
- Focus timer, achievements, scores and rewards use device-local storage and are not protected against local editing.
- Game scores and rewards are local-only; no global or friend leaderboard is provided by this layer.
- The arcade currently has eight games (five educational and three relaxation/creative). Educational question banks are starter content and require educator review before broad curriculum claims. Full real-device QA and accessibility audit are still required.

## Update (22 Nov 2026): what changed in this build
- One currency: coins, earned by studying and spent in the Marketplace. Gems and stars were removed.
- Added: JKBOSE/CBSE syllabus reader, Study Board (quizzes, mistakes), Duolingo-style Lingo path, calendar planner, working portals and themed islands, three new arcade games.
- Packaging files added: store-ready manifest (description, category, shortcuts, maskable icon), `privacy.html` template, `twa-manifest.json`, `.well-known/assetlinks.json` template, `BUILD-ANDROID.md`.
- Still open from the list above: signed AAB, real-device QA, AI endpoint rate limits and in-app AI reporting, replacing CDN dependencies, store screenshots, completed privacy policy and Data Safety form.
