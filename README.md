# Neurokov

The website of Neurokov, an automation agency for B2B service businesses: [neurokov.com](https://neurokov.com).
Neurokov builds automated systems that find leads, answer them in seconds and run the back office.
The site explains what it builds, shows the results in case studies and asks for one thing: booking
a free systems audit.

It is a static site built with [Astro](https://astro.build), with no server, database or logins.
Every page is plain HTML, CSS and a little TypeScript. The calendar is Cal.com, and booking answers
are emailed through Web3Forms.

## Pages

| Address | Page |
| --- | --- |
| `/` | Home: the promise and free audit, a reel of the case study films, the track record, a working model of the lead system, selected work, the founder, why Neurokov, the five services, the process, the guarantee and FAQs |
| `/services/` | The five services, each with its own page: `workflow-automation`, `lead-generation`, `automation-agents`, `crm-sales-automation`, `marketing-automation` |
| `/case-studies/` | Four case studies, each with its own page: `psychology-platform`, `outbound-engine`, `speed-to-lead`, `back-office-autopilot` |
| `/process/` | The four steps from the free audit to launch and support, and what Neurokov needs from the client |
| `/about/` | Who builds the systems, the problem they solve and how Neurokov works |
| `/faq/` | Questions on pricing, the guarantee, security and more |
| `/book/` | The booking form with the calendar |
| `/privacy/`, `/terms/` | Privacy policy and terms of service |

Any other address shows the 404 page, which has its own short film.

## Booking

Every booking button on the site opens the same form, and the book page has it built in. It asks
four questions: business name, niche, monthly revenue and a few words about the business. Then
Cal.com's calendar for the free audit (`cal.com/neurokov/free-systems-audit`) opens, with the
answers attached to the booking.

The answers are also emailed to Neurokov through Web3Forms as soon as the form is sent, so a
visitor who leaves without picking a time is not lost. The same answers are sent once a day at
most, however many times the form goes in (a second try, a reload, another tab), and a failed
send is retried the next time. Cal.com's code only loads once someone starts booking.

## What moves

- **Story films.** Seventeen short illustrated films tell the case studies, the services, the
  process steps, the founder's story, the welcome and the 404. Each has a written version for
  screen readers in `src/data/clips.ts`. Most play while on screen and pause when scrolled away;
  on the case study cards they play under the pointer.
- **Home page.** A boot intro (once per visit, skipped by any key or click), a reel that plays
  each case study's film in turn with a split-flap counter, the lead system model with simulated
  leads running through it, a case list that previews each film beside the pointer, and a photo
  that develops out of a dot pattern with its screens moving.
- **Welcome guide.** On a first visit, NK-01, the Neurokov robot, offers a tour: the welcome film,
  then a spotlight that walks the home page stop by stop.
- **Everywhere.** Sections and headlines animate in on scroll, labels decode, a ruler tracks the
  scroll, and a small tag beside the pointer says what a click will do. Service pages run their
  workflow as a live circuit.

Visitors whose device asks for reduced motion get no intro and no scroll animations, and the
films wait for their play button, as they also do in data-saver mode. There is a light and a
dark theme.

## Search, speed and accessibility

- Each page has its own title, description, canonical address and share card (`public/og.png`).
  The sitemap (`/sitemap-index.xml`) and `robots.txt` are built with the site.
- Structured data tells search engines who Neurokov is (every page), the site's name (home) and
  the questions answered (FAQ and service pages).
- Photos are served as AVIF or WebP at the size the screen needs, films and photos load as they
  come into view, fonts are served by the site itself, and links start loading on hover.
- On phones and tablets, sections below the first screen are laid out and painted only as they come
  near it, so the first screen paints sooner.
- Pages work by keyboard, with a skip link, labelled controls, visible focus and text versions of
  every film.

## Security

`public/_headers` sets the headers sent with every page: a Content-Security-Policy that allows
only this site, Cal.com and Web3Forms, HTTPS only (HSTS), no framing by other sites, and no
access to the camera, microphone or location. The site sets no cookies and runs no analytics.

Netlify adds a "Powered by Netlify" badge script (`/.netlify/scripts/hud`) to every page it serves.
The Content-Security-Policy would block the badge and log an error on every page (Lighthouse best
practices 92), so each page carries an empty placeholder that makes the script stand down
(`Base.astro`). Turning the badge off in Netlify's project settings, where the plan allows it, stops
the script being sent at all.
The visitor's browser keeps a few small notes for them: the chosen theme, that the intro and the
welcome guide have been seen, and which booking answers were already emailed.

The Web3Forms access key in `src/data/site.ts` is public by design: it can only send email to the
address it was made for.

## Where things are

```
src/pages/        one file per page; service and case pages are built from src/data/
src/layouts/      Base.astro (head, SEO, nav, footer) and Legal.astro (privacy, terms)
src/components/   the sections and pieces the pages are made of
src/scripts/      the code that runs in the browser: booking, nav and theme, each effect
src/styles/       global.css, the design system and every section's styles
src/data/         the words and numbers: site details, services, cases, process, FAQs, stats
src/assets/       the films (clips/), the home page photo (images/) and its loop (video/)
public/           copied into the site as is: icons, share image, robots.txt, _headers
scripts/          checks that run after every build
design/           the sources the films, photo and icons are made from (not part of the site)
netlify.toml      how Netlify builds the site
```

To change contact details, the Cal.com link or the Web3Forms key, edit `src/data/site.ts`. Other
text is in `src/data/`, or in the page or component it appears in.

## Work on it

Needs Node 22.12 or newer.

```sh
npm ci              # install the exact versions in package-lock.json
npm run dev         # http://localhost:4321, updates as you edit
npm run build       # build the site into dist/ and run the checks
npm run preview     # serve dist/ locally
```

`npm run build` fails, with a message saying what to fix, when:

- the Content-Security-Policy in `public/_headers` would block one of the site's own inline
  scripts (`scripts/check-headers.mjs` gives the hash to add), or
- a page still shows a placeholder (`scripts/check-placeholders.mjs`). A value listed in
  `unconfirmed` in `src/data/site.ts` is marked on every page that uses it, and adding `?review`
  to any address outlines it. `npm run build:draft` builds without this check.
