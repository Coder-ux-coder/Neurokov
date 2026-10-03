/**
 * Everything that identifies Neurokov. Edit this file, not the pages.
 *
 * `unconfirmed` lists what is still a placeholder. Every element built from an
 * unconfirmed value carries a `data-ph` attribute, adding `?review` to any URL
 * outlines them on the page, and `npm run build` refuses to finish while any
 * are left. Delete a key once the real value is in.
 */
export const unconfirmed = new Set<string>([
  // site.web3forms, the key that emails us the booking form's answers. Make one at web3forms.com
  // with site.email (no account or password: the key arrives by email), put it in, then delete this.
  'web3forms',
]);

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
  web3forms: '',
  cal: {
    link: 'neurokov/free-systems-audit', // cal.com/<link>
  },
  founder: {
    name: 'Mohid Zeeshan',
    role: 'CEO & Founder',
  },
};

export const calUrl = `https://cal.com/${site.cal.link}`;

/**
 * Every booking button opens the same free audit. The default label is below;
 * pages pass their own wording so the site never says the same line twice in a row.
 */
export const cta = {
  label: 'Book a free audit',
  final: 'Book my free audit',
};
