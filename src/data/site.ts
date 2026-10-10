/**
 * Everything that identifies Neurokov. Edit this file, not the pages.
 *
 * `unconfirmed` lists what is still a placeholder. Every element built from an
 * unconfirmed value carries a `data-ph` attribute, adding `?review` to any URL
 * outlines them on the page, and `npm run build` refuses to finish while any
 * are left. Delete a key once the real value is in.
 */
export const unconfirmed = new Set<string>([
  // None left. Facts made up on 2026-10-10 at the owner's request were settled before launch the same
  // day: the guarantee's terms confirmed (guarantee.ts); the price bands (pricing.ts), the company
  // (`company`, below), the client names and the "before" numbers dropped.
]);

/** The data-ph value for a key that is still a placeholder, else undefined (attribute omitted). */
export const ph = (key: string) => (unconfirmed.has(key) ? key : undefined);

/**
 * The registered company, in the footer and the legal pages. Neurokov isn't registered yet: a made-up
 * one ("Neurokov Ltd", a dummy number and office) stood here for a day and went at the owner's word
 * (2026-10-10), so the site names the trading name alone. Once it is registered, put the real name,
 * number and registered office here (`company` and `legalName` follow).
 */
type Company = { name: string; number: string; office: string };
const company = null as Company | null;

export const site = {
  name: 'Neurokov',
  company,
  // The name the footer and the legal pages go by: the registered one once there is one.
  legalName: company?.name ?? 'Neurokov',
  url: 'https://neurokov.com',
  title: 'Neurokov | We get B2B service businesses new clients',
  description:
    'Neurokov is a lead generation agency for cold email and cold calling. We find your buyers, book qualified sales calls on your calendar and make sure no lead goes cold. Results, or you don’t pay.',
  email: 'mohid@neurokov.com',
  // The booking form's answers are emailed to `email` the moment the form is sent, booked or not,
  // through Web3Forms. Its access key is public by design: it only ever sends to the address it was made for.
  web3forms: '3ed13961-19b3-492c-a6be-b5909e134f64',
  // The free growth audit is booked on a Google Calendar appointment schedule (Google Workspace). Its ID is the
  // last part of the booking page's address: calendar.google.com/calendar/appointments/schedules/<ID>
  booking: {
    schedule: 'AcZssZ3pI7O33Aq8IlyifoRBJcP6u_FKp3ImGevO7x6z9r_QXEWnnoSvS-2z8XROD3jsGPXhe1kb_bYP',
  },
  founder: {
    name: 'Mohid Zeeshan',
    role: 'CEO & Founder',
  },
};

/** The audit's booking page on Google Calendar, in US English: times read 5:00pm, not 17:00. */
export const bookingUrl = `https://calendar.google.com/calendar/appointments/schedules/${site.booking.schedule}?hl=en`;
/** The same page made to sit inside one of this site's (Google's own "website embed"). */
export const bookingEmbedUrl = `${bookingUrl}&gv=true`;

/**
 * Every booking button opens the same free audit. The default label is below;
 * pages pass their own wording so the site never says the same line twice in a row.
 */
export const cta = {
  label: 'Book a free audit',
  final: 'Book my free audit',
};
