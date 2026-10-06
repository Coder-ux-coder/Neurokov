# Neurokov

The website of Neurokov, a lead generation agency for B2B service businesses:
[neurokov.com](https://neurokov.com). Neurokov gets its clients new clients: it finds their buyers,
answers every lead in under a minute and books the sales calls. The site sells the result, shows it
in case studies and asks for one thing: booking a free growth audit. The guarantee: results, or you
don't pay.

It is a static site built with [Astro](https://astro.build), with no server, database or logins.
Every page is plain HTML, CSS and a little TypeScript. Calls are booked on a Google Calendar
booking page (Google Workspace), and booking answers are emailed through Web3Forms.

## Pages

| Address | Page |
| --- | --- |
| `/` | Home, laid out like LeftClick's: who we are and the guarantee, the intro video, the real numbers, the tools we work with, the psychology platform as the featured case (with its co-founder's words), more of the work, the founder, the process, the guarantee, FAQs and the booking button |
| `/services/` | The three services, each with its own page: `lead-generation` (outbound), `lead-conversion` (every lead answered in under 60 seconds), `lead-reactivation` (old leads, new clients), and a working model of how leads get answered |
| `/case-studies/` | Three case studies, each with its own page: `psychology-platform`, `outbound-engine`, `speed-to-lead`, and the record: the photo of a pipeline dashboard |
| `/process/` | The four steps from the free audit to launch and scaling what works, and what Neurokov needs from the client |
| `/about/` | Who's behind Neurokov, the problem it solves and how it works |
| `/faq/` | Questions on pricing, the guarantee, security and more |
| `/book/` | The booking form, then the booking page to pick a time |
| `/privacy/`, `/terms/` | Privacy policy and terms of service |

Any other address shows the 404 page, which has its own short film. The addresses of the services
and case study retired in October 2026 redirect to the pages that replaced them (`netlify.toml`).

## The home page

Modelled on LeftClick's: get to the point and don't repeat it. The header and the guarantee, the
intro video, the real numbers, the tools we work with, one featured case told in full, the rest of
the work, the founder, the process, the guarantee, questions and one thing to do. Nothing on it
makes you wait.

- **The intro video.** Until there's a recording of Mohid, an illustrated film says what we do and
  how we work (`design/clips/intro.html`). The script, recording tips and where the files go are in
  `design/vsl/script.md`: drop `vsl.mp4` (with `vsl.jpg`, its cover, and `vsl.vtt`, its captions)
  into `src/assets/video/` and it takes the film's place. It loads nothing until it's played, and
  plays with sound.
- **Quotes.** A client's own words go on their case study in `src/data/cases.ts` (`quote`), with
  how they agreed to be shown. Only real quotes: the psychology platform's comes from its co-founder.

## Booking

Every booking button on the site opens the same form, and the book page has it built in. It asks
four questions: business name, niche, monthly revenue and a few words about the business. Then the
free growth audit's booking page on Google Calendar takes the form's place, and the visitor gives their
name and email and picks a time there (in US English, so times read 5:00pm). Google adds the call,
with a Google Meet link, to mohid@neurokov.com's calendar and emails the visitor the invite.

The answers are emailed to Neurokov through Web3Forms as soon as the form is sent, so a visitor who
leaves without picking a time is not lost. The
same answers are sent once a day at most, however many times the form goes in (a second try, a
reload, another tab), and a failed send is retried the next time. Google's booking page only loads
once the form is sent. Without JavaScript the form posts straight to Web3Forms, which sends the
visitor on to `/book/pick-a-time/`, the booking page on a page of its own.

## What moves

- **Story films.** Thirteen short illustrated films: the introduction, the founder, the case studies,
  the services, the process steps and the 404. Each has a written version for screen readers in `src/data/clips.ts`. Most play
  while on screen and pause when scrolled away; on the case study cards they play under the pointer.
- **Elsewhere.** The services page runs simulated leads through a working model of how leads get
  answered; each service page runs its steps as a live circuit; the case studies page has a photo
  that develops out of a dot pattern, with the dashboard on its screen moving.
- **Everywhere.** Sections and headlines animate in on scroll, labels decode and a ruler tracks the
  scroll.

Visitors whose device asks for reduced motion get no scroll animations, and the films wait for
their play button, as they also do in data-saver mode. There is a light and a dark theme.

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
only this site, Google Calendar's booking page and Web3Forms, HTTPS only (HSTS), no framing by
other sites, and no access to the camera, microphone or location. The site sets no cookies and runs
no analytics.

Netlify adds a "Powered by Netlify" badge script (`/.netlify/scripts/hud`) to every page it serves.
The Content-Security-Policy would block the badge and log an error on every page (Lighthouse best
practices 92), so each page carries an empty placeholder that makes the script stand down
(`Base.astro`). Turning the badge off in Netlify's project settings, where the plan allows it, stops
the script being sent at all.
The visitor's browser keeps a few small notes for them: the chosen theme and which booking answers
were already emailed.

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
design/           the sources the films, photo and icons are made from, and the intro video script (not part of the site)
netlify.toml      how Netlify builds the site
```

To change contact details, the booking page or the Web3Forms key, edit `src/data/site.ts`. Other
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
  scripts (`scripts/check-headers.mjs` gives the hash to add),
- a page links to a page or file on the site that doesn't exist (`scripts/check-links.mjs`), or
- a page still shows a placeholder (`scripts/check-placeholders.mjs`). A value listed in
  `unconfirmed` in `src/data/site.ts` is marked on every page that uses it, and adding `?review`
  to any address outlines it. `npm run build:draft` builds without this check.
