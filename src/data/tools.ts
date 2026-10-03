import {
  siAirtable,
  siCaldotcom,
  siCalendly,
  siClaude,
  siClickup,
  siGmail,
  siGoogleanalytics,
  siGooglesheets,
  siHubspot,
  siMailchimp,
  siMake,
  siN8n,
  siNotion,
  siQuickbooks,
  siStripe,
  siXero,
  siZapier,
} from 'simple-icons';

/** SVG path data (24x24 viewBox) for tools that have a mark in simple-icons. */
const marks: Record<string, string> = {
  n8n: siN8n.path,
  Make: siMake.path,
  Zapier: siZapier.path,
  Claude: siClaude.path,
  HubSpot: siHubspot.path,
  Airtable: siAirtable.path,
  Notion: siNotion.path,
  'Google Sheets': siGooglesheets.path,
  Gmail: siGmail.path,
  Stripe: siStripe.path,
  Calendly: siCalendly.path,
  'Cal.com': siCaldotcom.path,
  ClickUp: siClickup.path,
  Xero: siXero.path,
  QuickBooks: siQuickbooks.path,
  Mailchimp: siMailchimp.path,
  'Google Analytics': siGoogleanalytics.path,
};

export const toolMark = (name: string): string | undefined => marks[name];

/** The strip under the hero. */
export const marqueeTools = [
  'n8n',
  'Make',
  'Zapier',
  'Claude',
  'HubSpot',
  'Airtable',
  'Notion',
  'Google Sheets',
  'Gmail',
  'Stripe',
  'Calendly',
  'ClickUp',
  'Xero',
  'QuickBooks',
  'Cal.com',
  'Mailchimp',
  'Google Analytics',
];
