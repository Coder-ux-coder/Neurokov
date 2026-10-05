/**
 * Everything that identifies Neurokov. Edit this file, not the pages.
 *
 * `unconfirmed` lists what is still a placeholder. Every element built from an
 * unconfirmed value carries a `data-ph` attribute, adding `?review` to any URL
 * outlines them on the page, and `npm run build` refuses to finish while any
 * are left. Delete a key once the real value is in.
 */
export const unconfirmed = new Set<string>(['booking']);

/** The data-ph value for a key that is still a placeholder, else undefined (attribute omitted). */
export const ph = (key: string) => (unconfirmed.has(key) ? key : undefined);

export const site = {
  name: 'Neurokov',
  // Not registered yet, so the footer and legal pages use the trading name. Put the registered name here once it exists.
  legalName: 'Neurokov',
  url: 'https://neurokov.com',
  title: 'Neurokov | Automation for service businesses',
  description:
    'Neurokov builds automated systems that find your leads, answer them in seconds and run your back office. n8n certified, 150+ automations shipped. It works, or you don’t pay.',
  email: 'mohid@neurokov.com',
  // The booking form's answers are emailed to `email` the moment the form is sent, booked or not,
  // through Web3Forms. Its access key is public by design: it only ever sends to the address it was made for.
  web3forms: '3ed13961-19b3-492c-a6be-b5909e134f64',
  // The free audit is booked on a Google Calendar appointment schedule (Google Workspace). Its ID is the
  // last part of the booking page's address: calendar.google.com/calendar/appointments/schedules/<ID>
  booking: {
    schedule: 'REPLACE-WITH-SCHEDULE-ID',
  },
  founder: {
    name: 'Mohid Zeeshan',
    role: 'CEO & Founder',
  },
};

/** The audit's booking page on Google Calendar. */
export const bookingUrl = `https://calendar.google.com/calendar/appointments/schedules/${site.booking.schedule}`;
/** The same page made to sit inside one of this site's (Google's own "website embed"). */
export const bookingEmbedUrl = `${bookingUrl}?gv=true`;

/**
 * Every booking button opens the same free audit. The default label is below;
 * pages pass their own wording so the site never says the same line twice in a row.
 */
export const cta = {
  label: 'Book a free audit',
  final: 'Book my free audit',
};
