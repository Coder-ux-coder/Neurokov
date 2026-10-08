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
- H5 FIXED (fonts preloaded + font-display: optional; first-visit CLS 0.00000 on 17 pages x 5 viewports): First-visit font swap moves text: desktop nav links (0.002), mobile hero full stop
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

### From auditor B (site shell)
- B-01 FIXED major: Tab to a control below unrendered sections (<=1100px) left it off screen: smooth
  scroll vs content-visibility placeholders. scroll-behavior: auto at <=1100px.
- B-02 FIXED major (with A-07): menu/theme dead until site.js.
- B-03 FIXED major: stalled site.js left content hidden forever: boot.ts drops .js after 8 s.
- B-04 FIXED major: focus ring #ff4f00 on paper 2.87:1 -> --accent-ink (5.16:1).
- B-05 FIXED minor: no-JS nav had no background over text.
- B-06 FIXED minor: theme buttons hidden until the head script marks .themes.
- B-07 FIXED minor (+S-1): theme re-read on pageshow(persisted) and prerenderingchange.
- B-08 FIXED minor: flap SR text kept its case ("<60s").
- B-09 FIXED (= A-09).
- B-10 FIXED minor: data saver now holds hover previews (liveOk).
- B-11 FIXED (clamp). B-12 FIXED (is-on-dark).
- B-13 FIXED minor: button labels wrap whenever the button would overflow (any width); one-line
  rendering identical.
- B-14 FIXED minor: check-links uses fileURLToPath.
- S-2 FIXED: gutter and fixed corners respect safe-area insets (landscape notch).
- S-5 FIXED: phone menu is a <nav aria-label="Main">.
- S-7 FIXED: matchMedia addListener fallback.
- S-8 FIXED: autocomplete removed from the honeypot checkbox.
- S-3, S-4 NOT CHANGED (unverifiable / not a defect), S-6 NOT VERIFIABLE locally.

### Auditor C (pages, media)
- Hit the usage limit twice before reporting; its scope is re-audited fresh in round 2.

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
- T3-2 FIXED (9621fbd: footer stacks at <= 1100px): footer columns squeezed at 961-1100 px.
- T3-3 FIXED (9621fbd: .chart__head > .label flex none): chart label "FIG. 02" wrapped on phones.
- T3-4 FIXED (9621fbd + 9a9327b: 44px targets under pointer: coarse): small touch targets.

## Round 2 (auditors A-D on round2/dist = main 9a9327b)
- Resumed 3 times after usage limits (agent ids: A a391cc1c17888eb01, B a21709b454d547e7d,
  C aff3baa8eab0a01b1, D a409bef1084082b66). No final reports yet.

## Task 2 progress (2026-10-07/08), worktree /home/user/nk-perf (branch perf-wip)
- Lantern facts: LCP graph = every request (except low-priority images) that ENDED before the
  observed LCP; so fonts (75 KB) were in it: +3 round trips (450 ms) over FCP. Documents over
  14,600 bytes transfer cost one more round trip (150 ms) for FCP and LCP.
- 1609191 fonts: frac/numr/dnom/pnum/locl dropped, signs wght 600-900: 74.6 -> 64.1 KB; pixel
  identical (fontcmp.mjs, 41M pixels, all weights/widths).
- page-styles.mjs (uncommitted): per-page CSS pruning in astro:build:done, css-tree (already in the
  tree; PurgeCSS rejected: npm audit high via fast-glob/braces). Keeps 61%. BUG found and fixed:
  dataset.theme -> data-theme not a literal token (dark mode rules were dropped); wordsIn() maps
  dataset.x/ariaX to attribute names.
- First-screen holds (uncommitted): case-study film, service film and the first row of case cards
  were outside [data-hold], so they waited for site.js + a 0.9 s fade: observed LCP 1.1-1.2 s after
  FCP on 7 pages (phone and laptop). data-hold now also works on a single block (CSS :is(), reveal.ts).
  Phone: LCP = FCP on all 7 pages after the fix (lcpgap.mjs).
- Remaining desktop gap 100-200 ms on film pages: the poster upgrade (768w inline -> full srcset)
  makes a later, larger LCP entry (upscaled image counts at intrinsic size). By design (sharpness).
- Lighthouse bf-cache audit fails 2/8 runs on main and perf alike ("IgnoreEventAndEvict", internal,
  not actionable); real navigation restores 60/60 (bfloop.mjs, full Chromium, incl. chrome://terms).
- Quiet-machine mobile medians, main -> perf (fonts+prune+chunks): book FCP 991->817 LCP 1373->1129;
  faq 984->835 / 1351->1127; services LCP 1426->1352; about 1426->1362; home 1502->1434; TBT 0.
- npm audit: sharp <0.35.5 high (pre-existing, build-time); mention to user / bump separately.
