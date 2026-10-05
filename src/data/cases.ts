/**
 * Case studies, confirmed by the user. The psychology platform is unnamed on
 * purpose (the user's call); Mohid co-founded it, so the copy says so. Since
 * 2026-10-05 Neurokov sells new clients, not automation: each study leads with
 * the clients and calls it brought in, and uses only the facts confirmed here.
 *
 * Page order follows LeftClick's case studies: outcomes first ("We ..." with a
 * number), then the challenge, then what we built. `placeholder: true` would
 * put a data-ph marker on everything rendered from an entry and block the build.
 */
export interface CaseStudy {
  slug: string;
  placeholder: boolean;
  /** Its story clip (src/data/clips.ts). */
  clip: string;
  title: string;
  client: string;
  service: string;
  serviceSlug: string;
  summary: string;
  stats: { value: string; label: string }[];
  outcomes: string[];
  challenge: string;
  /** What we did. */
  built: string[];
  /** A walk through how it plays out for the client. Only restates `built`; no new facts or numbers. */
  how: string;
  /** The confirmed tools, sales and marketing ones only. Left out where the user hasn't confirmed them. */
  stack?: string[];
  /** Before/after charts. Only pairs where both ends are stated in the study; `v` is the bar length out of 100. */
  figures?: Figure[];
}

export interface Figure {
  title: string;
  before: { label: string; value: string; v: number };
  after: { label: string; value: string; v: number };
  note?: string;
}

export const cases: CaseStudy[] = [
  {
    slug: 'psychology-platform',
    placeholder: false,
    clip: 'psychology',
    title: 'Online psychology platform',
    client: 'Healthcare, co-founded by Mohid Zeeshan',
    service: 'Inbound Lead Conversion',
    serviceSlug: 'lead-conversion',
    summary:
      'We brought new clients into an online psychology platform and turned every enquiry into a booked session. The business grew by over 100% in a single month.',
    stats: [
      { value: '100%+', label: 'growth in a single month' },
      { value: 'Every', label: 'enquiry answered straight away' },
    ],
    outcomes: [
      'We grew the business by over 100% in a single month.',
      'We built the lead gen and marketing that brought new clients in.',
      'We made sure every enquiry got an answer straight away.',
      'We turned enquiries into booked sessions, with reminders before and follow-ups after.',
    ],
    challenge:
      'An online psychology platform grows as fast as it brings in new clients and turns enquiries into booked sessions. Every enquiry needed an answer, intake forms, a session time and follow-ups. Done by hand, that work grew with every client, and it put a ceiling on how fast the business could grow.',
    built: [
      'Lead gen and marketing that bring new enquiries in and keep warming them up until they book.',
      'An answer to every enquiry straight away, with the intake forms attached.',
      'Booking without the back-and-forth: forms collected and sessions scheduled, with nobody chasing.',
      'Reminders before every session and follow-ups after it.',
      'Live numbers, so every decision about growth runs on what’s actually happening.',
    ],
    how: 'A new enquiry gets an answer straight away, with the intake forms attached. When the forms come back, the client picks a session time and it’s booked, with a reminder before the session and a follow-up after it. Meanwhile the marketing keeps new enquiries coming in and warms up anyone who isn’t ready yet. Nobody has to push any of it along.',
    figures: [
      {
        title: 'The business, against the month before',
        before: { label: 'Month before', value: '1×', v: 48 },
        after: { label: 'One month in', value: '2×+', v: 100 },
        note: 'The business more than doubled: growth of over 100% in a single month.',
      },
    ],
  },
  {
    slug: 'outbound-engine',
    placeholder: false,
    clip: 'outbound-engine',
    title: 'Outbound engine',
    client: 'B2B growth agency, 25 people',
    service: 'Outbound Lead Generation',
    serviceSlug: 'lead-generation',
    summary: '46 qualified sales calls in the first 30 days, without hiring a single salesperson.',
    stats: [
      { value: '46', label: 'qualified calls in the first 30 days' },
      { value: '90%+', label: 'inbox placement, main domain untouched' },
      { value: '0', label: 'sales hires needed' },
    ],
    outcomes: [
      'We booked 46 qualified sales calls in the first 30 days.',
      'We kept their main domain clean, with inbox placement above 90%.',
      'We did it without them hiring a single salesperson.',
      'We took prospecting off the founders’ plates for good.',
    ],
    challenge:
      'This agency lived on referrals. Great months, then quiet ones, and no way to tell which was coming. They’d tried cold email twice with freelancers and burned a domain both times. The two founders were still the only people selling, squeezing prospecting in around client work.',
    built: [
      'Studied their 40 best clients and found what those companies had in common. That became the targeting.',
      'Found and verified 6,000 matching companies and the people who make the buying decision, refreshed every month.',
      'Set up 12 sending domains and 36 warmed inboxes, completely separate from the agency’s main domain.',
      'Opened every email with a line about something real on the prospect’s website or in their recent posts.',
      'Sorted every reply by intent within seconds. Interested leads got a booking link, and the founders got a Slack message with the context.',
    ],
    how: 'Every weekday, the next batch of matching companies is researched and emailed, each message opening with something real from their website or recent posts. The emails go out from 36 warmed inboxes on separate domains. When a reply lands, it’s sorted by intent within seconds: interested leads get a booking link, and the founders get a Slack message with the full context. Their only job is to show up to the calls.',
    stack: ['Apollo', 'Clay', 'Instantly', 'HubSpot', 'Slack'],
  },
  {
    slug: 'speed-to-lead',
    placeholder: false,
    clip: 'speed-to-lead',
    title: 'Speed-to-lead',
    client: 'Management consulting firm, 12 partners',
    service: 'Inbound Lead Conversion',
    serviceSlug: 'lead-conversion',
    summary: 'Every inbound lead answered in under 60 seconds, and a close rate that went up 31% in one quarter.',
    stats: [
      { value: '<60s', label: 'first reply, down from 19 hours' },
      { value: '31%', label: 'higher close rate in one quarter' },
      { value: '11 hrs', label: 'back for each partner, every week' },
    ],
    outcomes: [
      'We cut first reply time from 19 hours to under 60 seconds.',
      'We lifted the close rate 31% in one quarter.',
      'We got proposals out the same day, not four or five days later.',
      'We handed 11 hours a week back to every partner.',
    ],
    challenge:
      'Inbound leads landed in a shared inbox and waited, on average, 19 hours for a reply. By then plenty had booked a call with someone else. Partners spent their evenings writing proposals from scratch, and the CRM was a graveyard nobody trusted.',
    built: [
      'Every form fill, email and LinkedIn enquiry now lands in one place, with duplicates merged.',
      'Each lead is checked against the firm’s ideal-client criteria and gets a personal reply within 60 seconds.',
      'Good-fit leads get a booking link for the right partner. Everyone else hears from the firm again with something worth reading.',
      'After every sales call, the partner gets a draft proposal in the firm’s own template, ready to review the same day.',
      'Deals in HubSpot move forward as calls are booked, proposals sent and contracts signed.',
    ],
    how: 'A lead fills in the form at 11pm on a Sunday. Within 60 seconds, they have a personal reply. If they fit the firm’s criteria, that reply comes with a booking link for the right partner. If they don’t, they keep hearing from the firm until they’re ready. After the sales call, a draft proposal in the firm’s template is ready the same day, and the deal moves through HubSpot as the call is booked, the proposal goes out and the contract is signed.',
    stack: ['HubSpot', 'Calendly', 'Gmail', 'Slack'],
    figures: [
      {
        title: 'Time to first reply',
        before: { label: 'Before', value: '19 hrs', v: 100 },
        after: { label: 'After', value: '<60 s', v: 0.09 },
        note: 'At this scale, the new reply time is a sliver: under a minute against 19 hours.',
      },
    ],
  },
];
