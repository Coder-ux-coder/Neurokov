/**
 * The story clips: illustrated films made in design/clips and rendered into
 * src/assets/clips by render.mjs --install. `text` says what happens in each,
 * for screen readers and for anyone who can't watch. Case clips use only the
 * numbers confirmed in cases.ts; a service clip that borrows a case's numbers
 * names it in `source`. Service clips are named after the service's slug.
 */
export const clips: Record<string, { title: string; text: string; source?: string }> = {
  intro: {
    title: 'Neurokov, an introduction',
    text: 'Illustrated introduction. A business owner is great at the work, but the calendar is almost empty: short on clients. What we do: we find your buyers, every lead gets an answer in under 60 seconds, and old leads come back into conversation. How we work: a free audit, a plan with one fixed price, launch, then booked calls. Results, or you don’t pay.',
  },
  'speed-to-lead': {
    title: 'Speed-to-lead, as a story',
    text: 'Illustrated story, with real numbers from case 03. A lead writes in at 11:47 PM. The old way, the first reply took 19 hours. With Neurokov, a personal reply goes out in under 60 seconds and the call is booked by morning.',
  },
  'outbound-engine': {
    title: 'The outbound engine, as a story',
    text: 'Illustrated story, with real numbers from case 02. An agency that lived on referrals had great months, then quiet ones, and cold email burned a domain twice. With Neurokov the calendar fills up: 46 qualified calls in the first 30 days, with zero sales hires and the main domain untouched.',
  },
  psychology: {
    title: 'The psychology platform, as a story',
    text: 'Illustrated story, with real numbers from case 01. Every enquiry at an online psychology platform needed chasing, and growth hit a ceiling. With Neurokov, new clients flow in and every enquiry is answered, followed up and booked. The business grew by over 100% in a single month.',
  },
  'lead-generation': {
    title: 'Outbound lead generation, as a story',
    text: 'Illustrated story, with real numbers from case 02. A founder squeezes prospecting in after client work and falls asleep at the laptop. With Neurokov, six steps run every weekday: find ideal accounts, enrich and verify them, write a personal first line, send from warmed inboxes, sort the replies by intent and book the call. In case 02 that meant 46 qualified calls in the first 30 days, with zero sales hires.',
    source: 'case 02',
  },
  'lead-conversion': {
    title: 'Speed to lead, as a story',
    text: 'Illustrated story, with real numbers from case 03. New leads pour into a funnel full of cracks, and most of them roll away. With Neurokov, every lead goes through five steps: the form is submitted, the lead is checked and qualified, a personal reply goes out within 60 seconds, the call is booked on your calendar, and the CRM is updated and the team notified. In case 03 the first reply went from 19 hours to under 60 seconds.',
    source: 'case 03',
  },
  'lead-reactivation': {
    title: 'Lead reactivation, as a story',
    text: 'Illustrated story. A wall of old leads nobody has written to in months gathers dust. With Neurokov they hear from the owner again, replies come back, and the ones who answer land on the calendar as booked calls. Old leads, new clients.',
  },
  founder: {
    title: 'Mohid Zeeshan, our founder, as a story',
    text: 'Illustrated story. Mohid, Neurokov’s founder, grew the online psychology platform he co-founded: steady months, then one more than double the last. He stands in the top 1% in lead generation, and shares what works with the sales and lead generation communities he’s part of. Your clients, found by the top 1%.',
  },
  'process-audit': {
    title: 'Step 01, the free audit, as a story',
    text: 'Illustrated story. The business as a pipeline, from leads to replies, calls and clients, leaking at three joints. NK-01 goes along it with a magnifier, flags the leaks in order of payoff and hands over the plan.',
  },
  'process-scope': {
    title: 'Step 02, the plan and fixed price, as a story',
    text: 'Illustrated story. NK-01 writes the plan line by line and a fixed-price sticker goes on it. The client walks in, reads it and signs, and the stamp comes down: agreed.',
  },
  'process-build': {
    title: 'Step 03, launch, as a story',
    text: 'Illustrated story. Everything is set up block by block. A test run turns up one bad result, NK-01 fixes it, the second run is clean, and NK-01 presses Go live. From then on every item comes out done.',
  },
  'process-support': {
    title: 'Step 04, scale what works, as a story',
    text: 'Illustrated story. The client enjoys a coffee while NK-01 watches the dashboard. An alert rings, NK-01 fixes it before anyone notices, then plugs in a new campaign and the calls-booked chart climbs.',
  },
  'not-found': {
    title: 'A broken link, as a story',
    text: 'Illustrated story. A link has snapped and the signals die at the gap, until NK-01 grabs both ends and becomes the link, and they run on through to home.',
  },
};
