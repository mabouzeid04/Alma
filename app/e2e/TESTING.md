# Testing Guide

## Overview
- E2E: Detox + Jest (iOS simulator, Expo dev client).
- Coverage:
  - `e2e/firstTest.e2e.ts`: Home smoke test (hint text visible).
  - `e2e/home.e2e.ts`: Home screen suite (render states, streak logic, navigation, greeting buckets).
- No unit tests are defined yet.

## Prerequisites
- Xcode with an available iOS simulator (configured for iPhone 16 Pro in `.detoxrc.js`).
- Node/npm installed.
- From the `app/` directory, install dependencies: `npm install`.

## E2E (Detox, iOS)
Commands (run from `app/`):
- If you already have the iOS build and only changed JS/TS: `npm run detox:test:ios:reuse` (fastest, but can be flaky; prefer full run if failing)
- Fresh app install using existing build (more reliable): `npm run detox:test:ios`
- Rebuild the iOS app (only when native bits change or build folder is missing): `npm run detox:build:ios`

What the home tests do:
- `firstTest.e2e.ts`: Launches with empty seed, asserts home hint text.
- `home.e2e.ts`:
  - `home-render-empty`: Empty state, no insights button, hint visible.
  - `home-render-with-sessions`: Seeds 3 sessions, shows insights button and streak text.
  - `home-streak-logic`: Seeds gap days, verifies streak not shown.
  - `home-start-session`: Taps orb and lands on conversation screen.
  - `home-swipe-history`: Swipes up to history screen.
  - `home-header-nav`: Settings and insights buttons navigate correctly.
  - `home-greeting-buckets`: Morning and evening greetings via seeded hour.

Seeding and control flags:
- Seeds are driven by deep links, parsed in `src/services/e2e-bridge.ts` and applied at startup:
  - `secondbrain://e2e?seed=empty` → no sessions.
  - `secondbrain://e2e?seed=three` → three consecutive days (streak=3).
  - `secondbrain://e2e?seed=gap` → two sessions with a 1-day gap (streak resets).
  - Add `&hour=8` (or any number) to force greeting hour buckets.
- Tests launch the app with these URLs (`device.launchApp({ url: ... })`), granting microphone permission.

When do I need to rebuild or prebuild?
- JS/TS-only changes: do NOT rebuild. Use `npm run detox:test:ios:reuse` (or `detox:test:ios` for fresh install).
- If `detox:build` fails saying workspace missing: run `npx expo prebuild --platform ios` once to regenerate native iOS, then `cd ios && pod install` if needed, then `npm run detox:build:ios`.
- If you changed native deps or Expo config that affects native code: run `npm run detox:build:ios` again.
- If builds feel stale: `rm -rf ios/build && npm run detox:build:ios`.

Notes and tips:
- Built app lives at `ios/build/Build/Products/Release-iphonesimulator/SecondBrain.app` (Detox config expects this).
- Simulator target is iPhone 16 Pro (see `.detoxrc.js`). Detox boots it if not running.
- If reuse mode (`detox:test:ios:reuse`) flakes, run the full install (`detox:test:ios`) to resync the app binary and seeds.
- Artifacts (screenshots, logs) go under `artifacts/detox` when enabled.

## Troubleshooting
- If builds are stale, clean and rebuild: `rm -rf ios/build && npm run detox:build:ios`.
- Ensure no other Metro/Expo instance is running when executing Detox tests.

