/**
 * In their own words. Real quotes from people who agreed to be quoted, attributed the way they
 * agreed to be shown.
 *
 * `draft: true` marks a suggested quote still waiting for the client's approval (the wording we'll
 * send them, built only on the numbers confirmed in cases.ts). Drafts show while working on the site
 * (`npm run dev`), tagged as drafts, and never in a production build: the live site only ever
 * quotes what a client has actually said. Once a client approves (or rewrites) theirs, put their
 * words in, their name and role as they want them shown, and delete `draft`.
 *
 * The psychology platform (case 01) speaks through Mohid, who co-founded it: his own account,
 * attributed so it's plain he also founded Neurokov.
 */
export interface Testimonial {
  quote: string;
  name: string;
  /** Who they are, as they agreed to be shown: role and business, or kind of business. */
  role: string;
  /** The case study it belongs to (cases.ts), if there is one: the card links to it. */
  caseSlug?: string;
  /** Suggested wording, not yet approved by the client: never on the live site. */
  draft?: boolean;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      'Every enquiry used to need chasing, and our growth hit a ceiling. Once every enquiry got an answer straight away and went on to a booked session, with reminders and follow-ups that never slipped, the business more than doubled in a single month.',
    name: 'Mohid Zeeshan',
    role: 'Co-founder of the online psychology platform in case 01, and founder of Neurokov',
    caseSlug: 'psychology-platform',
  },
  {
    quote:
      'We’d tried cold email twice and burned a domain both times. Neurokov booked us 46 qualified calls in the first 30 days, without a single sales hire, and our main domain never took a hit.',
    name: 'Co-founder',
    role: 'B2B growth agency, 25 people',
    caseSlug: 'outbound-engine',
    draft: true,
  },
  {
    quote:
      'Our leads used to wait 19 hours for a reply. Now every one hears back in under a minute, and our close rate went up 31% in a quarter. The partners got their evenings back, too.',
    name: 'Managing partner',
    role: 'Management consulting firm, 12 partners',
    caseSlug: 'speed-to-lead',
    draft: true,
  },
];

/** The quotes to show: approved ones always, drafts only while working on the site. */
export const shownTestimonials = testimonials.filter((t) => !t.draft || import.meta.env.DEV);
