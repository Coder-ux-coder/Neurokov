# Findings ledger

Status codes: OPEN, FIXED (commit), REJECTED (reason).

## Round 1

### From the harness (automated)
- H1 FIXED (booking.ts: frame ignores pointer 700 ms after it appears): Double-click on "See available times" sends the second click into the Google Calendar
  frame that appears under the pointer (focus moves into the iframe, so Escape no longer closes the
  dialog; with the real calendar the click can select a slot). Mobile and desktop. booking.ts pickATime.
- H2 FIXED (site.ts: refit only on width change, in the next frame): "ResizeObserver loop completed with undelivered notifications" error on window (desktop,
  first visit). site.ts fit(): the observer watches the footer container, whose HEIGHT changes when
  fit() changes the wordmark size inside the callback.
- H3 FIXED (ruler readout by transform, fill by clip-path): The scroll ruler readout is positioned with `top: calc(var(--p) * 100%)`, so every scroll
  frame moves it in layout: a stream of layout shifts on every desktop page (CLS > 0 in the field).
  global.css .ruler__read.
- H4 FIXED (ruler takes band colours over .footer/.section--ink; scrollY clamped): Ruler readout fails colour contrast where it overlaps the dark footer (axe, desktop light).
- H5 OPEN: First-visit font swap moves text: desktop nav links (0.002), mobile hero full stop
  (.accent-mark, 0.0005 in Lighthouse). CLS > 0.
- H6 WATCH: /process/ desktop light: one '#text' shift (1.7e-5) at 2.7 s in the crawl; not reproduced
  in 6 targeted runs.

### From auditor A (booking)
- A-01 FIXED (backdrop click ignored within 600 ms of opening and for detail > 1) major: double-click on a booking button opens the dialog, then the 2nd click hits the
  backdrop and closes it (laptop all buttons; tablets nav + footer). booking.ts backdrop handler.
- A-02 FIXED (retries 5/15/30/60/120/300 s, on online, and on pagehide) major: failed Web3Forms send is silent, never retried automatically.
- A-03 FIXED (log {at, ok}; under-way window 60 s; keepalive abort on leave ignored) minor: "sent" mark set before outcome; reload mid-send -> duplicate; keepalive abort on
  leave erases the mark; concurrent tab case loses answers.
- A-04 FIXED (storage is the source of truth when it works) minor: sentLog() merges stale in-memory sentHere over storage.
- A-05 FIXED (dialog scrollTop = 0 on step 2) minor: step 2 opens scrolled to its bottom on short screens (dialog keeps scrollTop).
- A-06 FIXED (data-booking-page + Button href #pick on pick-a-time) minor: on /book/pick-a-time/ booking buttons send the visitor back to step 1.
- A-07 FIXED (nkLater cap 2.5 s after DOMContentLoaded; menu in shell.ts at boot; link burger until menu-ready; theme in head script) minor: nkLater waits for window load; a hanging Google frame (pick-a-time) leaves the
  menu and theme buttons dead. Also on every page the JS menu button is dead until site.js runs
  (~5 s on slow 3G): show the link burger until the script is bound, or bind early.
- A-08 FIXED (focus back to the menu button) minor: dialog opened from the phone menu returns focus to body on close.
- A-09 FIXED (@keyframes dialog-in) minor: .booking-dialog[open] uses @keyframes film-in, deleted in ba13ea1.
- A-S1 CONFIRMED, NOT CODE: Google page title is "Free Systems Audit" (GET 200). User must rename the appointment schedule in Google Calendar.: Google booking page may still say "Free Systems Audit" (check with a GET).
- A-S2 FIXED (reply.success === false counts as a failure): Web3Forms 200 with success:false would count as sent (parse JSON).

## Task 3 (mobile layout)
- Prompt: task-3-mobile-layout.md. Scanner: tools/layout.mjs.
## Task 2 prototypes
- P1 (fonts preload + font-display: optional, no swap): first-visit shifts 0.00000 on all 17 pages x 5
  viewports (was up to 0.0196). Worktree /home/user/nk-perf.

## Incident
- My probe tests (probe-retry 5, probe-leave) ran Chromium without route interception for a keepalive
  request sent on pagehide / used host-resolver-rules, which the environment's HTTPS proxy bypasses.
  Up to 4 real test submissions likely reached Web3Forms -> the client's inbox: "Acme Dental (dental)"
  x1, "Leave Co (n)" x3. Fixed: tools/safe.mjs SAFE_ARGS (--no-proxy-server + resolver block) on every
  launch; auditors B and C told. Report to the user.

## Task 3 findings so far
- T3-1 FIXED: the floating theme button covered text on phones/tablets on nearly every screen; it now
  sits in the bar (<= 62.5em). Sticky hover on touch fixed.
- T3-2 TODO: footer columns squeezed at 961-1100 px (1024 landscape): 3-line link wraps.
- T3-3 TODO: case study chart label "FIG. 02" wraps into two lines on phones.
- T3-4 TODO: touch targets: footer links 19 px tall; clip controls 38 px; burger/theme 42 px.
