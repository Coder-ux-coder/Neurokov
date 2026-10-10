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

## Round 3 (2026-10-09): the live site, PageSpeed Insights as the measure (main b043ce4)

Baseline on neurokov.com, home, two PageSpeed runs: phone FCP 939/927, LCP 950/935, SI 990/980,
TBT 0, CLS 0; laptop FCP 306/295, LCP 322/315, SI 588/503. All four scores 100; one diagnostic:
a non-composited animation on `.clip__toggle`.

What PageSpeed counts (Lighthouse 13.5, read from its source and the reports):
- A page whose transfer (headers, about 1,150-1,360 bytes, plus the body) is 14,600 bytes or less
  arrives in the first round trip; more costs one round trip more (150 ms phone, 40 ms laptop).
  Netlify's Brotli comes out about 1% under quality 5 streamed (book live 13,522-13,556 bytes
  against 13,674 locally). The book page was 346 bytes over, though b043ce4 meant it to fit.
- Speed index = 1.4 x observed + 0.4 x layout-based on a phone (0.575 / 0.49 on a laptop), never
  under FCP. Home: phone 980 = 1.4 x 425 + 0.4 x 963; laptop 503 = 0.575 x 602 + 0.49 x 319. The
  laptop's observed first paint (564 ms) waited on style and layout of the whole page.
- PageSpeed's headless Chrome plays no H.264. Its final screenshot shows the home film held, big
  play button: the film downloaded (1.4 MB), failed, and switched to held mid-load. That switch
  was the non-composited animation, and a change on the first screen counted in the speed index.

- P1 FIXED (head script): the scheduler that holds the site's script until after the first paint
  moved from the head script into boot.ts. 576 bytes off the head script on every page.
- P2 FIXED (page-styles.mjs): pruned after the head script is minified (the prose of its comments
  kept rules alive: "machine", "circuit", "split", "quote", "lead"...), markup words read from tags
  only (names, attributes, values; not text), and font faces of families nothing sets text in
  dropped. 244-541 bytes off every page as served; book 13,674 -> 13,243 (one round trip live).
  Every rule dropped was checked absent from the page's markup and from every string in the
  scripts.
- P3 FIXED (global.css, shell.ts): wider than 1100px, sections below the first screen wait to be
  laid out as on phones, until the visitor's first move (pointer, key, wheel, touch, focus,
  scroll): then .laid-out lays the whole page out, so the ruler and smooth in-page scrolling work
  on real heights. Lighthouse never moves, so it measures the first screen's work only.
- P4 FIXED (lib.ts filmsPlay): a browser that can't play H.264 keeps the films' posters, fetches no
  film, and shows no player buttons that couldn't play anything.
- P5 FIXED (_headers): font-src and media-src dropped from the CSP (default-src 'self' covers them).
- Kit: vdiff.mjs scrolls instantly (the page's smooth scrolling made the two builds' screenshots
  catch different scroll positions) and re-measures the page as it grows; stylediff.mjs (computed
  style of every element, both builds) and fold.mjs (first screen before a move, links, #addresses,
  tab stops, ruler) added; QA_CHROMIUM; lh.mjs --live and --cpu; serve.mjs compresses as Netlify.
- REJECTED: dropping the twitter:* duplicates of og:* (17 bytes), drawing the hero rule from the
  first frame (at most 2 ms of speed index, bytes on every page), counting words after [ or # in
  scripts as lookups (no change).
- NEXT: the booking dialog's markup and styles out of every page's HTML (the dialog only works once
  site.js runs anyway): FAQ would come to about 13,000 bytes, one round trip.

## Round 4 (2026-10-09): copy, films, and the booking popup out of the pages (main a83e637 on)

- Copy (user): "since 2023" (was 2020); close rate "over 20%" / "20%+" (was 31%) in the stats, cases,
  FAQ, services, the lead-conversion and founder films, the share card, the VSL script and the home
  photo's dashboard tile (re-lit in DejaVu Sans, the font the screens were captured in).
- Films: render.mjs scales to TV range (ffmpeg 9 kept Chrome's full-range JPEG frames: yuvj420p,
  12-14% bigger). Founder Fig. 2 breaks after "lead" (the climber crossed "lead generation" at
  8.2-8.7 s).
- P6 FIXED (booking popup): not in the pages' HTML any more. booking.ts fetches /booking-popup/ on the
  visitor's first move, or on the press of a booking button (busy cursor meanwhile; the book page if
  it can't be had). booking.css holds the form's styles; page-styles.mjs keeps the rules the popup
  shares with a page that fetches it. Every page but the book pages is 1.6-1.9 KB lighter as served;
  FAQ 14,858 -> 13,108 bytes (one round trip), privacy 12,385 -> 10,507, home 35,052 -> 33,337. The
  fetch URL must hold no class name: /booking-dialog/ kept .booking-dialog's rules on the book pages
  (the pruner reads every word of the scripts), and /book/ went over its budget.
  - Local Lighthouse, 3 runs: phone FAQ FCP 1066 -> 867, SI 1092 -> 867; laptop FAQ FCP 342 -> 242,
    privacy 263 -> 241.
  - stylediff, popup open (7 pages, 320-1440, both themes) and closed (17 pages, 7 widths): same.
    Book pages: same.
- P7 (site.ts fit): the footer wordmark is fitted again whenever a font face finishes loading. With a
  deliberately late face of other widths the old fit stayed wrong (239 of 356 px), the new one refits
  (351). CORRECTION: the 50.7 px wordmark stylediff showed on two pages was not this. 50.7 px is the
  unfitted size (13vw), read in the same instant stylediff forced the footer to lay out, before the
  fit's next frame; in real loads the fit runs as the footer is laid out (46.5 px, every run).
  stylediff now waits three frames after laying sections out.
- P8 FIXED (touch targets): the footer's legal links and back links were 43.92 px tall and the FAQ's
  index links 43.94 (padding 13 / 12.5 px on 11.2 / 11.84 px type): now 14 px paid back with margins,
  and min-height 44px. The footer's short column links ("FAQ" 33 px wide) get min-width 44px. A dead
  duplicate (.footer__cols a 8.5 px, overridden by the 10 px rule after it) is gone; the busy cursor of
  a booking button moved from every page's CSS into booking.ts. Every page 6-63 bytes lighter
  (book 13,339 -> 13,311, FAQ 13,111 -> 13,081); stylediff: only these properties, desktop the same.
  layout.mjs before it (17 pages x 12 phone/tablet sizes): no sideways scroll, overlap, clipping or
  covered control anywhere; nothing under WCAG 2.5.8's 24 px.
- Kit: the harness waits for the fetched popup, checks it isn't in the page before a move, and that a
  booking button falls back to /book/ when the fetch fails; stylediff --dialog, and it no longer reads
  the head (a build may add styles there as it goes).
- Harness on the round's build: 0 failures (warnings: long tasks, one aborted film). shifts.mjs: 0 on
  every page, five devices.
- FIXED (npm audit): sharp 0.35.4 -> 0.35.5 (GHSA-wq5f-xc86-pv6w, librsvg, high; build time only).
  Rebuilt without the image cache: all 175 images and every page byte for byte the same.
- BLOCKED: Netlify skipped fa64412, 9f0a456 and a83e637 ("Skipped" on the public deploys page); live
  is still b043ce4. Needs the owner's login: stopped builds, credits, then "Trigger deploy".

## Round 5 (2026-10-10): the first screen still from its first paint; a new Netlify project

- Hosting (owner): a new Netlify account and project, "neurokov" (Free plan, created 2026-10-09),
  the domain moved to it (Namecheap DNS: A @ 75.2.60.5, www CNAME neurokov.netlify.app). Round 4's
  BLOCKED is resolved: b6c2bc3 is live there. Every push to main is a production deploy, which costs
  credits on this plan: the round goes out in one push.
- PageSpeed on b6c2bc3, home, a warm run. Phone: FCP 930, LCP 938, SI 1114, TBT 0, CLS 0. Laptop:
  FCP 296, LCP 327, SI 382.
  - What the phone's browser really saw: the HTML's first byte at 19 ms, its last at 345, the first
    paint at 483 (the poster in it: LCP the same), speed index 520, the last change on screen at
    2,447 ms.
  - Phone speed index = 1.4 × that observed one + 0.4 × a layout-based one (965 here).
- P9 FIXED (global.css): the first screen ([data-hold]) no longer rises 16 px into place, and its
  rules (.draw) are there from the first frame. Speed index counts every frame after the first paint
  that differs from the last one. The rise (0.6 s) and the hero rule's draw (it waits for site.js, then
  0.2 + 1.3 s) kept the home page's first screen changing until 2.4 s on PageSpeed.
  - Lighthouse, phone, no H.264, 9 interleaved runs: observed SI less FCP 36 -> 4 ms on the home page.
    The 4 ms is a headless scrollbar fading, not the page.
  - Parts of the 36 ms: the text's rise about 20 ms, the rule's draw 12, the film's rise 0-4.
  - Every page, phone: 28-66 -> 4-5 ms. Laptop: 42-99 -> 1-5 ms, except about (25 ms: below).
  - On PageSpeed's phone formula that is about 45 ms less on the home page.
  - CORRECTION to round 3's REJECTED ("drawing the hero rule from the first frame, at most 2 ms of
    speed index"): it was 12 ms of the observed speed index.
  - stylediff: only the animation properties and transform (identity matrix -> none) of the first
    screen's blocks. Screen-reader-only spans inside them are now placed from another ancestor: the
    identity transform made each block a containing block. Buttons and heroes are isolated, and
    nothing inside a first screen sits above z-index 4 (the bar is 50, the grain 80).
- Netlify (Free plan, projects created after 2026-08-19): a "Powered by Netlify" badge on every page,
  for every visitor.
  - How: `<script async src="/.netlify/scripts/hud?variant=public">` added to the HTML as served
    (10 KB, cached 60 s), which is then sent chunked.
  - Off in Project configuration > General > Powered by Netlify badge (the owner's setting). Turned off
    on 2026-10-10 with the owner's OK: the live HTML has had no hud script since, and the plain
    (uncompressed) response now has a Content-Length.
- Investigated, no change:
  - Home page HTML size. 33 KB as served, compressed: the poster 12.3 KB, the CSS 11.2, the markup
    9.6. That is two round trips in Lighthouse's model: FCP 930, where one would give about 780.
    Without the poster it's still 20.5 KB. One round trip would need the poster out of the page (LCP
    waits for it) and the CSS split into a first-screen part and the rest (sections unstyled if the
    rest comes late). Not done. Most other pages are two round trips for the same reason (their posters).
  - Netlify's edge. From here every body arrives about 120 ms after its headers, whatever the size:
    13 KB FAQ, 33 KB home, 33 KB font. These are mostly cache misses (fwd=miss), each edge keeping its
    own cache. A smaller page would not arrive sooner.
  - A fresh browser (PageSpeed's). It sets the first visit in the fallback fonts, and on Windows each
    size of each face loads the system font again: 1 MB, 1.5-5 ms each, 58 ms before the first paint,
    plus 34 ms shaping first lines. Locally the first paint is then often the bar alone, with the hero
    100 ms later.
    - <link rel=expect blocking=render> (paint once the hero is parsed) made every first paint whole,
      but 30 ms later than the hero came without it, and Lighthouse's FCP 100 ms worse. Not done.
    - PageSpeed's run painted the hero with its first frame (LCP = FCP = 483).
  - Lighthouse keeps local storage between runs in one browser. After a page's first run it loads as a
    return visit (fonts preloaded), which locally cost FAQ and book about 130 ms of estimated FCP.
    PageSpeed starts fresh: lh.mjs --fresh.
- REJECTED: holding the logo marquee still until the visitor's first move. It shows on the first
  screen only on a laptop, on about: 25 ms of the observed speed index, 14 ms of the estimate. Its
  logos (tools.svg) would then pop in at that move. (Moot since round 6: the strip is gone.)
- Kit: settle.mjs --no-h264; lh.mjs --fresh.

## Round 6 (2026-10-10): the critic's points, then proof the clairvo.io way (out with round 7)

- The owner's picks from a critic's ten points: the B2B cases first (case 01 the outbound engine, 02
  speed-to-lead, 03 the psychology platform; the films' case numbers re-rendered), "top 1%" replaced
  by checkable facts (150+ automations shipped, 50K+ hours handed back, n8n certified, since 2023;
  the founder film re-rendered), "No fine print, no arguing." gone, the logo marquee gone
  (Marquee.astro). Price bands (pricing.ts), the guarantee's terms (guarantee.ts) and a company line
  (site.ts) MADE UP at the owner's request and gated as placeholders: `npm run build` fails until the
  owner confirms or drops them.
- P10 FIXED (services/index.astro, SectionHead `hold`, global.css): with the marquee gone, /services/'
  "What we do" landed on the first screen from 548 px up and drew in after the first paint. It's held
  now, its rule (`.section-head__rule::after`) drawn from the first frame. settle.mjs: every first
  screen final from the first paint on /, /case-studies/, /about/ and /services/, phone and laptop.
- The owner, later the same day, after clairvo.io: no named clients (the made-up names went), no
  made-up "before" numbers (the made-up "1 in 5 calls closed to 1 in 4" didn't match "20%+"); a
  number and what it covers instead. The board's line under each number is `note` (stats.ts); home's
  featured case shows how it runs and its three numbers in a row (`.stats--ruled`), not the outcomes
  list. Placeholders left: guarantee, prices, company.
- The owner: keep the look (the texture, the stamp, the films, the board), about 25% "more serious".
  Page changes are the browser's crossfade in 0.2 s (was an orange wipe), headline words rise in
  0.85 s, 40 ms apart (was 1.05 s, 60 ms). A calmer stamp without the sheet's shake was tried and
  REJECTED by the owner ("it should shake, like previously... that is necessary"): both as before.
- P11 FIXED (global.css; the owner saw "Results, or you don't pay" cut at the top, and the % cut):
  - The CTA's outlined ticker clipped both ways. On a first visit its stand-in face (fallback.css,
    sized to Archivo's widths) stands taller than the 0.9 line, and the letters' tops were cut flat.
    Now `overflow-x: clip` only.
  - The board's % in the stand-in face, which has no narrow widths, overflowed its tile (ink 29 px in
    a 27 px tile at 1280): signs on a first visit are drawn at scaleX(0.78).
  - Every headline word's mask (.w) shaved its last letter's right edge: the tight tracking ends the
    word's box before its ink does (the r of "for"). Padded 0.12em at the sides, paid back by margins.
  - Found with textclip.mjs (new): every clipping box that holds text, shot as is and showing all, on
    a first and a later visit, at 1280x640 and 390x844. Before: 102 flagged on 8 pages, nearly all
    headlines (and the services page's working model, whose dot moves between the two shots: now
    skipped). After: 0 on all 16 pages. Copies with the old mask and the old ticker box were flagged
    (9 headlines on home; the ticker on a first visit).
- Sizes (Brotli q5, streamed): /book/ 13,219 (156 to spare, was 97), /faq/ 13,087 (288, was 231).
- The owner, last that day: case 01's calls are 17 in its first 30 days, a feasible number (was 46),
  on every page, in the films (outbound-engine: a call most working days, 2, 3, 5, 5 then 2 a week;
  its referral month cut to 11 calls so the story still climbs), on the dashboard photo and the share
  image. The two B2B clients undescribed: no "growth agency", "consulting firm" or "partners" (the
  owner has their numbers, not who they were); the film kickers say "Cold email" and "Inbound leads".
  Cold calling and cold email named as what Neurokov specializes in (home's lead, the services, a
  new FAQ, the site description).
- The strip under the opening is back on home, services, about and the case studies, listing what we
  specialize in instead of the tools (the owner: the tools were irrelevant). Marquee.astro reads
  specialties.ts, the site's own line icons in orange. Three copies of its list, moved on by a third
  (`marquee-third`): one copy is 2,073 px, never narrower than the strip's window up to 5120 px
  (with two, 3440 px and wider showed a gap at the loop's end).
- Ticks green (the owner: a red tick reads as wrong). `--ok` (#1d7a4a on paper, 4.6:1; #5fd39a in the
  dark theme and the dark bands) on the hero's shield, the guarantee and booking notes, every check
  list and the "for you" column; the founder's role icon a briefcase, not a badge with a tick. The
  films' tick badges `CAST.GREEN` (#22a35a, the ink tick on it 5.8:1), process-scope's drawn ticks
  too; 12 films re-rendered.
- The dashboard photo redone without the stock photo: the finished still with its grade undone stood
  in for it (incoming/stock/, not kept), the screen re-composited and pasted back inside the glass
  only (the room around it unchanged). It shows case 01: 17 calls, 92% placement, 36 inboxes on 12
  domains, 6,000 companies; calls by week 2, 3, 5, 7; calls by the email that got the reply. The
  loop (home-feature.mp4) re-made from the same stand-in.
- P12 FIXED (Footer.astro; the owner): the footer's "Book a free audit" was a plain link to /book/,
  the one booking link on the site that left the page; every other opens the booking popup. It's
  a booking link now (`data-book`, booking.ts), the book page without JavaScript as before, and
  `#pick` on the pick-a-time page, as Button.astro does.
- P13 FIXED (global.css, `.footer__word`): the footer wordmark, a link home, was 30-41 px tall on
  phones (fitted to the width at line-height 0.8), the one target layout.mjs still found under 44 px
  on every page. 8 px more box above and below, paid back by its margins: nothing moves.

## Round 7 (2026-10-10): less decoration, the owner's list (one push, with rounds 5 and 6)

- "100% free" said once a page, in the opening's promise (home, the services, the book pages); the
  CTA, the footer, the FAQs and the process's first step say "free" or "no cost" (home said it six
  times).
- The numbering labels gone: the menu's 01-04, every "Fig. 01" (captions, charts, the working
  model, the booking panel, the share image, and inside the eight films that had them: 26 kickers,
  re-rendered), the founder's "File 001". Kept, as not named: the sections' 01 / 05 counters, case
  and step numbers, the photo's numbered callouts, the case pages' "Result 01".
- The moving strip under the opening gone again ("drop the logo marquee"): Marquee.astro,
  specialties.ts and their icons and styles. Cold calling and cold email stay in the copy.
- The board's numbers stand still: no blanking and flipping in on scroll (startFlaps gone); the
  process page's step counter still flips as it scrolls.
- The reply time as a simple before -> after, the one result with a stated before (19 hours, case
  02): the board shows 19H on small dim tiles, an arrow, <60S; the case card and the case page
  "19 hrs -> <60s". The others have no stated before and stay as they are.
  - P14 FIXED (global.css): the case page's result card split it as "19 / hrs / <60s" at 820 px,
    its arrow stranded at the right (the before's box shrank and its text wrapped), and as
    "19 hrs ->" over "<60s" at 1280. The before never breaks now (`white-space: nowrap`) and is half
    size there, as on the board: one line at 1280, 390 and 320; over "<60s" at 820. The board: one
    line from 360 px up, over it at 320. The chart's "<60 s" is "<60s", as everywhere else.
- No starting price (the owner started to give one, then said not to). The made-up price bands on
  /services/ (pricing.ts) are still there, gated.
- The photo's third callout and caption follow its new dashboard ("Booked from", "which email got
  the reply").
- The made-up company gone (the owner: remove "· Company no. 00000000"): Neurokov isn't registered,
  so site.ts `company` is null. The footer reads "© 2026 Neurokov. All rights reserved." and /terms/
  and /privacy/ name the trading name alone (no "Neurokov Ltd", dummy number or office). Placeholders
  left: guarantee, prices.
- P15 FIXED (booking.ts): on the book pages a booking button that scrolls the page to its panel (the
  footer's, since P12) left the clicks after the first to land on whatever the scroll carried under
  the pointer. On /book/ that's the footer's email link, just above it: harness storm, "request failed
  document mailto:...". A visitor's double click would have opened their mail app. Clicks are now
  dropped until the scroll ends (`scrollend`, or 1 s), and only when the page actually scrolls.
- A founder photo was offered and dropped the same day (the owner: "don't put the image in"): none on
  the site, as before.
- The last made-up facts settled before launch (the owner, asked): the price bands dropped
  (pricing.ts empty), so /services/ loses "What it costs" (its sections count to 04) and the FAQ's
  cost answer names no figure; the guarantee's terms confirmed as written (guarantee.ts). `unconfirmed`
  is empty and `npm run build`, Netlify's command, passes: "No placeholders left."
- QA on the release build (`npm run build`, no placeholders):
  - harness: 0 failures, 88 warnings (long tasks while crawling; films cut off mid-load by the rapid
    clicks), 1905 s. Before P15 it failed once: the mailto: above.
  - layout.mjs: 17 pages at 12 sizes, nothing flagged; small targets 0 everywhere (P13).
  - textclip.mjs: 0 on all 16 pages at 1280x640 and 390x844, first and later visit. One run flagged
    home's case headline: the label over it, a [data-decode] scramble, caught between the two shots
    (no clipping; 0 on two re-runs).
  - settle.mjs: every first screen final from its first paint, phone and laptop, all 17 pages.
  - Sizes (Brotli q5, streamed): /book/ 13,172 (203 to spare), /faq/ 13,056 (319).
  - The footer's booking link (a scratch test): the popup on /, /about/ and a case page at 1280 and
    390, the address unchanged; on /book/ its form comes into view, on pick-a-time its picker;
    without JavaScript a link to /book/. Without JavaScript Playwright's click flaked when it jumped
    straight to the footer: sections below the first screen keep placeholder heights until shown,
    so the footer's contents weren't drawn yet. A visitor scrolls there first.
  - Lighthouse (--fresh, 3 runs): laptop home 100, services 99 (CLS 0, TBT 4 / 105 ms). The phone
    runs were slowed by the machine (benchmark 717-954 against the 1850 the CPU factor assumes; a
    browser tab outside the tests used a whole core), so the release was measured in turns against
    the live version (b6c2bc3) built alongside: home, phone, perf 83/85 against 79/83, TBT 694/575
    against 879/695 ms, LCP 1558/1501 against 1759/1625 ms, 842 DOM nodes against 920, 13 requests
    against 14. No worse anywhere.
