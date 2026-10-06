# Findings ledger

Status codes: OPEN, FIXED (commit), REJECTED (reason).

## Round 1

### From the harness (automated)
- H1 OPEN: Double-click on "See available times" sends the second click into the Google Calendar
  frame that appears under the pointer (focus moves into the iframe, so Escape no longer closes the
  dialog; with the real calendar the click can select a slot). Mobile and desktop. booking.ts pickATime.
- H2 OPEN: "ResizeObserver loop completed with undelivered notifications" error on window (desktop,
  first visit). site.ts fit(): the observer watches the footer container, whose HEIGHT changes when
  fit() changes the wordmark size inside the callback.
- H3 OPEN: The scroll ruler readout is positioned with `top: calc(var(--p) * 100%)`, so every scroll
  frame moves it in layout: a stream of layout shifts on every desktop page (CLS > 0 in the field).
  global.css .ruler__read.
- H4 OPEN: Ruler readout fails colour contrast where it overlaps the dark footer (axe, desktop light).
- H5 OPEN: First-visit font swap moves text: desktop nav links (0.002), mobile hero full stop
  (.accent-mark, 0.0005 in Lighthouse). CLS > 0.
- H6 WATCH: /process/ desktop light: one '#text' shift (1.7e-5) at 2.7 s in the crawl; not reproduced
  in 6 targeted runs.

### From auditors
(pending)
