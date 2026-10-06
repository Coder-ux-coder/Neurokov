import { createHash } from 'node:crypto';
import {
  siBrevo,
  siCaldotcom,
  siCalendly,
  siGmail,
  siGoogleads,
  siGoogleanalytics,
  siGooglecalendar,
  siGooglemeet,
  siGooglesheets,
  siHubspot,
  siIntercom,
  siMailchimp,
  siMeta,
  siNotion,
  siTypeform,
  siWhatsapp,
  siZoho,
  siZoom,
} from 'simple-icons';

/** SVG path data (24x24 viewBox) for tools that have a mark in simple-icons. */
const marks: Record<string, string> = {
  HubSpot: siHubspot.path,
  Zoho: siZoho.path,
  Gmail: siGmail.path,
  'Google Calendar': siGooglecalendar.path,
  Calendly: siCalendly.path,
  'Cal.com': siCaldotcom.path,
  Zoom: siZoom.path,
  'Google Meet': siGooglemeet.path,
  WhatsApp: siWhatsapp.path,
  Mailchimp: siMailchimp.path,
  Brevo: siBrevo.path,
  Intercom: siIntercom.path,
  Typeform: siTypeform.path,
  'Google Ads': siGoogleads.path,
  Meta: siMeta.path,
  'Google Analytics': siGoogleanalytics.path,
  'Google Sheets': siGooglesheets.path,
  Notion: siNotion.path,
};

const id = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Every mark in one SVG file of symbols (/tools.svg, src/pages/tools.svg.ts). A page points to the
 *  marks it shows instead of carrying their drawings: they're most of a tool strip's weight, and the
 *  file is fetched once for the whole site, after the first screen is up (site.ts: the strip and the
 *  tool lists are all further down; without JavaScript the tools show by name). */
export const toolSprite =
  '<svg xmlns="http://www.w3.org/2000/svg">' +
  Object.entries(marks)
    .map(([name, path]) => `<symbol id="${id(name)}" viewBox="0 0 24 24"><path d="${path}"/></symbol>`)
    .join('') +
  '</svg>';

// Named by its content, so the file can be kept for a year and a changed one is fetched afresh.
const version = createHash('sha256').update(toolSprite).digest('hex').slice(0, 8);

/** Where a tool's mark is (an address for <use>), if it has one. */
export const toolMark = (name: string): string | undefined => (marks[name] ? `/tools.svg?v=${version}#${id(name)}` : undefined);

/** The strip under the hero: the sales and marketing tools we work with. */
export const marqueeTools = [
  'HubSpot',
  'Gmail',
  'Google Calendar',
  'Calendly',
  'Zoom',
  'Google Meet',
  'WhatsApp',
  'Mailchimp',
  'Brevo',
  'Zoho',
  'Intercom',
  'Typeform',
  'Google Ads',
  'Meta',
  'Google Analytics',
  'Google Sheets',
  'Notion',
  'Cal.com',
];
