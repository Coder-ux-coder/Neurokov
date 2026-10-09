import type { IconName } from '../components/icons';

/**
 * What Neurokov sells: new clients for B2B service businesses. Each service is sold on its result
 * (booked calls, leads answered, old leads won back), not on how the work gets done.
 */
export interface Service {
  slug: string;
  name: string;
  icon: IconName;
  /** One line for cards and menus. */
  card: string;
  title: string;
  sub: string;
  /** "Sound familiar?": the problems this service fixes, in the reader's words. */
  signs: string[];
  intro: string[];
  /** What the client gets, as results. */
  included: { title: string; text: string }[];
  flow: { title: string; caption: string; steps: string[] };
  tools: string[];
  faqs: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
}

export const services: Service[] = [
  {
    slug: 'lead-generation',
    name: 'Outbound Lead Generation',
    icon: 'target',
    card: 'We find the companies that should buy from you and put qualified sales calls on your calendar.',
    title: 'Qualified calls on your calendar.',
    sub: 'We find your buyers, start the conversations and book the calls. You show up and close. One agency got 46 qualified calls in its first 30 days.',
    signs: [
      'Your pipeline runs on referrals, so some months are packed and others are silent.',
      'You’ve tried cold email before, and it burned a domain or booked nothing.',
      'The founders are still the only ones selling, squeezing prospecting in after client work.',
      'Hiring a sales rep feels slow, expensive and risky.',
    ],
    intro: [
      'You don’t want more emails sent or more names in a spreadsheet. You want sales calls with people who can say yes. That’s what we’re paid for.',
      'We work out who actually buys from you, find those companies and the people who make the call, and start conversations that read like you wrote them yourself. When someone’s interested, the call goes straight onto your calendar.',
      'No sales hires, and no risk to your main domain. For one growth agency, that meant 46 qualified calls in the first 30 days, with inbox placement above 90%.',
    ],
    included: [
      {
        title: 'Calls with real buyers',
        text: 'Every call on your calendar is with a company that fits who you sell to, and a person who can make the decision.',
      },
      {
        title: 'Your buyers, found for you',
        text: 'We define who buys from you, then find those companies and the right people inside them. You never build a list again.',
      },
      {
        title: 'Messages that get replies',
        text: 'Every message opens with something real about the prospect, so it reads like it was written just for them.',
      },
      {
        title: 'Your main domain, untouched',
        text: 'We send from separate, warmed-up inboxes, so the emails land in the inbox and your main domain stays clean.',
      },
      {
        title: 'Interested replies, booked fast',
        text: 'When a prospect says yes, they get a booking link within seconds and you get a heads-up with the whole conversation.',
      },
      {
        title: 'Numbers you can see',
        text: 'Replies, booked calls and new clients in one simple report, so you always know exactly what you’re getting.',
      },
    ],
    flow: {
      title: 'The outbound engine',
      caption: 'Six steps, running every weekday. You show up for the calls.',
      steps: [
        'Find ideal accounts',
        'Enrich and verify',
        'Write a personal first line',
        'Send from warmed inboxes',
        'Sort replies by intent',
        'Book the call',
      ],
    },
    tools: ['Apollo', 'Clay', 'Instantly', 'HubSpot', 'Gmail', 'Google Calendar'],
    faqs: [
      {
        q: 'Does cold email still work?',
        a: 'When it’s done properly, yes. Tight targeting, real personalization and a clean sending setup still book meetings every week. Blasting a bought list is what stopped working.',
      },
      {
        q: 'Will this hurt our domain?',
        a: 'No. We send from separate domains set up to look and feel like yours, so your main domain is never on the line.',
      },
      {
        q: 'Who writes the emails?',
        a: 'We write them with you, test different angles and keep what works. You approve the messaging before anything goes out.',
      },
      {
        q: 'How soon will we see calls?',
        a: 'Sending starts the day we launch. The slow parts, like warming up new inboxes, happen before launch, so day one is a real sending day. One agency had 46 qualified calls in its first 30 days.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'Then you don’t pay. Before we start, we agree in writing what we’ll deliver. If we don’t deliver it, that’s on us, not you.',
      },
      {
        q: 'Is cold email legal?',
        a: 'B2B cold email is legal in most markets when you follow the rules: honest subject lines, real sender details and an easy way to opt out. We do all of that, and flag anything specific to your market.',
      },
    ],
    metaTitle: 'Outbound Lead Generation: Qualified Sales Calls, Booked | Neurokov',
    metaDescription:
      'We find your buyers, start real conversations and put qualified sales calls on your calendar, without risking your main domain. Results, or you don’t pay.',
  },
  {
    slug: 'lead-conversion',
    name: 'Inbound Lead Conversion',
    icon: 'timer',
    card: 'Every lead that comes to you gets a reply in under 60 seconds and a call on your calendar.',
    title: 'Every lead answered in under 60 seconds.',
    sub: 'The leads you already pay for stop going cold. Each one gets a personal reply in under a minute, day or night, and the good ones book a call. One consulting firm lifted its close rate by over 20%.',
    signs: [
      'New leads wait hours, sometimes days, for a first reply.',
      'By the time you call back, they’ve booked with someone else.',
      'Leads that come in at night or over the weekend sit there until Monday.',
      'Good deals go quiet because nobody followed up.',
    ],
    intro: [
      'The fastest reply usually wins the client. Most businesses take hours to answer a new lead, and by then the lead has booked a call with someone else.',
      'We make sure that never happens to you. Every enquiry gets a personal reply in under a minute, whether it lands at 2pm on a Tuesday or 11pm on a Sunday. Good-fit leads book a call with the right person, and nobody slips through the cracks.',
      'For one consulting firm, the first reply went from 19 hours to under 60 seconds, and the close rate went up by over 20% in a single quarter.',
    ],
    included: [
      {
        title: 'Replies in under 60 seconds',
        text: 'Every new enquiry gets a personal reply in under a minute, day or night, weekends included.',
      },
      {
        title: 'Calls booked straight in',
        text: 'Good-fit leads pick a time on the right person’s calendar in the same reply. No phone tag.',
      },
      {
        title: 'Follow-ups that never slip',
        text: 'Leads who don’t book hear from you again at the right moments, and it stops the second they reply.',
      },
      {
        title: 'The right lead to the right person',
        text: 'Every lead goes to whoever should take it, by service, size or location, the first time.',
      },
      {
        title: 'In your voice',
        text: 'Replies are written the way your team writes and sent from your team’s accounts. Anything complex goes to a person.',
      },
      {
        title: 'Every lead accounted for',
        text: 'One clear view of every lead, where it came from and what happened next. Nothing lost in a shared inbox.',
      },
    ],
    flow: {
      title: 'Speed to lead',
      caption: 'From form fill to booked call in about a minute, while your competitors are still reading the email.',
      steps: [
        'Form submitted',
        'Lead checked and qualified',
        'Personal reply in 60 seconds',
        'Call booked on your calendar',
        'CRM updated, team notified',
      ],
    },
    tools: ['HubSpot', 'Pipedrive', 'GoHighLevel', 'Salesforce', 'Calendly', 'Gmail', 'WhatsApp'],
    faqs: [
      {
        q: 'Do we need more leads first?',
        a: 'No. Most businesses lose more clients to slow replies than to a lack of leads. We start with the leads you already get, and if you want more, our outbound lead generation adds them.',
      },
      {
        q: 'Who do our leads hear from?',
        a: 'From you. Replies are written in your voice and sent from your team’s accounts. Anything complex is handed to a person on your team.',
      },
      {
        q: 'Which CRMs do you work with?',
        a: 'HubSpot, Pipedrive, GoHighLevel, Salesforce, Close and most others. If your team lives in spreadsheets, we can work with that too.',
      },
      {
        q: 'How soon will we see a difference?',
        a: 'From the first lead. The first enquiry that comes in after launch gets its reply in under a minute.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'Then you don’t pay. Before we start, we agree in writing what we’ll deliver. If we don’t deliver it, that’s on us.',
      },
    ],
    metaTitle: 'Inbound Lead Conversion: Every Lead Answered in 60 Seconds | Neurokov',
    metaDescription:
      'Every new lead gets a personal reply in under 60 seconds, day or night, and good-fit leads book a call straight away. One firm lifted its close rate by over 20%. Results, or you don’t pay.',
  },
  {
    slug: 'lead-reactivation',
    name: 'Lead Reactivation',
    icon: 'refresh-ccw',
    card: 'New clients from the old leads and past clients already sitting in your inbox and CRM.',
    title: 'New clients from your old leads.',
    sub: 'Every business has a pile of leads that never bought and past clients who went quiet. We turn them back into booked calls and new work.',
    signs: [
      'Leads who weren’t ready to buy never hear from you again.',
      'Past clients go quiet, and you only notice when you check the revenue.',
      'Your CRM is full of contacts nobody has emailed in a year.',
      'Your pipeline swings from feast to famine every few months.',
    ],
    intro: [
      'The easiest new client is one who already knows you. Most firms have hundreds of them: leads who said “not yet”, proposals that went quiet and past clients who would buy again if someone asked.',
      'We bring them back. Messages written in your voice reach out with a real reason to talk now, follow up at the right moments and stop the second someone replies. Anyone interested books a call on your calendar.',
      'You don’t need a single new lead to start. It’s pipeline you’ve already paid for.',
    ],
    included: [
      {
        title: 'Old leads, back in conversation',
        text: 'Leads who said “not yet” hear from you again, with a reason to talk now instead of a “just checking in”.',
      },
      {
        title: 'Past clients, buying again',
        text: 'Clients who went quiet get a timely nudge about what you can do for them next.',
      },
      {
        title: 'Booked calls, not opens',
        text: 'Interested contacts pick a time on your calendar. We report replies, booked calls and new clients, not vanity metrics.',
      },
      {
        title: 'Follow-ups that know when to stop',
        text: 'Every follow-up lands at the right moment, and the whole thing stops the second someone replies.',
      },
      {
        title: 'Your voice, your brand',
        text: 'Every message sounds like you and goes out under your name. You approve the messaging before anything is sent.',
      },
      {
        title: 'A clean contact list',
        text: 'Duplicates merged and dead contacts cleared out, so every message reaches someone who might actually buy.',
      },
    ],
    flow: {
      title: 'Old leads, back in conversation',
      caption: 'Leads and clients you already paid for, turned back into booked calls. Nothing new to buy.',
      steps: [
        'Old leads and past clients gathered',
        'List cleaned and checked',
        'A reason to talk, in your voice',
        'Replies sorted by interest',
        'Call booked on your calendar',
      ],
    },
    tools: ['HubSpot', 'Mailchimp', 'Brevo', 'Gmail', 'Calendly', 'Google Sheets'],
    faqs: [
      {
        q: 'Won’t old leads find this annoying?',
        a: 'Not when it’s done properly. We only reach out with a real reason to talk, keep it short and stop the moment someone asks.',
      },
      {
        q: 'Is it worth it with a small list?',
        a: 'Usually. A few hundred past leads and clients is plenty to start. We’ll tell you on the free audit whether your list is worth working.',
      },
      {
        q: 'Do you run our newsletter or ads?',
        a: 'No. We start conversations that end in booked calls. Your newsletter and ads stay with you.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'You don’t pay. Before we start, we agree in writing what we’ll deliver, and if we don’t deliver it, the cost is ours.',
      },
    ],
    metaTitle: 'Lead Reactivation: New Clients From Your Old Leads | Neurokov',
    metaDescription:
      'We turn the leads that never bought and the past clients who went quiet into booked calls and new work. No new leads needed. Results, or you don’t pay.',
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
