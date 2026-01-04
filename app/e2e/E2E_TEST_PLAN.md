# E2E Test Plan (Detox)

Suggested scenarios to implement, grouped by feature/screen. Reuse helpers from `e2e/init.ts` (permissions, launch) and prefer stable text/testIDs over animation timing.

## Home (index)
- Renders home hero: hint text, pulsing orb, header buttons (settings, insights when >=3 sessions), swipe hint.
- Start session: tap orb → navigates to conversation screen.
- Swipe up gesture: swipe up region → opens history.
- Empty state metadata: shows “Session 1” when no sessions; streak text appears after consecutive days.

## Conversation / Recording
- Mic permission flow: first launch prompts; permission granted leads to ready state; denied shows guidance.
- Record start/stop: tap to start recording, indicator active; tap stop saves session and navigates to processing/summary.
- Haptics feedback: medium on start, light on navigation (assert via mocked service or logs if exposed).
- Background/return: background app while recording then return → recording stops gracefully or resumes per design.
- Error handling: simulate audio init failure → shows error toast/message and allows retry.

## Processing / Summary
- Loading state: after stop, processing screen shows spinner/message.
- Completion: transitions to summary once AI finishes; summary displays title, key points, sentiment.
- Retry on failure: simulate AI failure → offers retry button; retry succeeds shows summary.

## History
- List rendering: sessions sorted newest first; shows date/time and snippet.
- Navigation: tap item → opens session detail; back returns to list with position preserved.
- Deletion: delete a session → item removed and storage updated; undo (if available) restores.
- Empty state: no sessions → shows empty illustration/message.

## Session Detail
- Content render: shows transcript, summary, and sentiment/insights.
- Playback (if available): play/pause audio recording; seek scrubbing works.
- Share/export (if present): triggers native share sheet or copy action.

## Insights
- Access control: appears only after threshold sessions (e.g., >=3).
- Cards render: shows top insights/memory nodes; pull-to-refresh updates content.
- Drill-in: tap insight → detail view loads correct data.
- Empty/insufficient data: shows guidance when not enough sessions.

## Settings
- Toggle controls: haptics on/off, any preferences persist after relaunch.
- Account/device info: shows app version/build when available.
- Navigation: back to home works reliably.

## Permissions & First-time
- Fresh install with denied mic: app surfaces permission request and fallback messaging.
- Grant after deny: user grants via Settings/System → app detects and enables recording.
- Cold start without network (if applicable): shows offline message and limits actions accordingly.

## Search/Filters (if present)
- Apply filter/search in history → list updates accordingly; clearing restores full list.

## Stability/Regression
- Fast relaunch: close app and relaunch twice quickly → no crash, state consistent.
- Orientation lock: remains portrait; rotation does not break layout.
- Deep links (if any): scheme `secondbrain://` routes to expected screen.

## Data Integrity
- Session save: after recording, new session appears in history with correct timestamp.
- Streak calculation: sessions on consecutive days update streak; missing a day resets.

