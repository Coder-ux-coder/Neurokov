/**
 * Case studies, confirmed by the user. The psychology platform is unnamed on
 * purpose (the user's call); Mohid co-founded it, so the copy says so.
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
  built: string[];
  /** A walk through the finished system. Only restates `built`; no new facts or numbers. */
  how: string;
  /** Left out where the user hasn't confirmed the tools. */
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
    service: 'Workflow Automation',
    serviceSlug: 'workflow-automation',
    summary:
      'We automated an online psychology platform end to end, from the first enquiry to the final invoice. The business grew by over 100% in a single month.',
    stats: [
      { value: '100%+', label: 'growth in a single month' },
      { value: 'End to end', label: 'lead gen, intake, booking, follow-ups, billing and reporting' },
    ],
    outcomes: [
      'We scaled the business by over 100% in a single month.',
      'We automated the business end to end, from the first enquiry to the final invoice.',
      'We put intake, booking and follow-ups on autopilot.',
      'We built the lead gen and marketing that brought new clients in.',
      'We replaced manual billing and reporting with systems that run on their own.',
    ],
    challenge:
      'Every new client at a psychology platform creates work: an enquiry to answer, intake forms to collect, sessions to book, reminders to send, invoices to raise and follow-ups to remember. Done by hand, that work grows with every client, and it puts a ceiling on how fast the business can grow.',
    built: [
      'Lead gen and marketing that bring new enquiries in and keep warming them up until they book.',
      'Intake and booking that run without anyone chasing: enquiries answered, forms collected, sessions scheduled.',
      'Reminders before every session and follow-ups after it, sent automatically.',
      'Billing and admin that take care of themselves: invoices out, payments tracked.',
      'Reporting that updates itself, so every decision runs on live numbers.',
    ],
    how: 'A new enquiry gets an answer straight away, with the intake forms attached. When the forms come back, the client picks a session time and it’s booked, with a reminder before the session and a follow-up after it. The invoice goes out on its own, the payment is tracked, and the numbers land in a report that’s always current. Nobody has to push any of it along.',
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
    service: 'Automated Lead Generation',
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
      'We did it without hiring a single salesperson.',
      'We took prospecting off the founders’ plates for good.',
    ],
    challenge:
      'This agency lived on referrals. Great months, then quiet ones, and no way to tell which was coming. They’d tried cold email twice with freelancers and burned a domain both times. The two founders were still the only people selling, squeezing prospecting in around client work.',
    built: [
      'Pulled their 40 best clients and found what those companies had in common. That became the targeting.',
      'Built and verified a list of 6,000 matching companies and the people who make the buying decision. It refreshes every month.',
      'Set up 12 sending domains and 36 warmed inboxes, completely separate from the agency’s main domain.',
      'Added a research step that reads each prospect’s site and recent posts, then writes an opening line about something real.',
      'Replies are sorted by intent within seconds. Interested leads get a booking link, and the founders get a Slack message with the context.',
    ],
    how: 'Every weekday, the system picks up the next batch of matching companies, researches each prospect and writes an opening line about something real on their website or in their recent posts. The emails go out from 36 warmed inboxes on separate domains. When a reply lands, it’s sorted by intent within seconds: interested leads get a booking link, and the founders get a Slack message with the full context. Their only job is to show up to the calls.',
    stack: ['Apollo', 'Clay', 'Instantly', 'n8n', 'HubSpot', 'Slack'],
  },
  {
    slug: 'speed-to-lead',
    placeholder: false,
    clip: 'speed-to-lead',
    title: 'Speed-to-lead system',
    client: 'Management consulting firm, 12 partners',
    service: 'CRM & Sales Automation',
    serviceSlug: 'crm-sales-automation',
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
      'Every form fill, email and LinkedIn inquiry now lands in one place, deduplicated and enriched automatically.',
      'Each lead is checked against the firm’s ideal-client criteria automatically and gets a personal reply within 60 seconds.',
      'Good-fit leads get a booking link for the right partner. Everyone else goes into a nurture sequence worth reading.',
      'After every sales call, the transcript becomes a draft proposal in the firm’s own template, ready to review.',
      'Deals in HubSpot move stages on their own when calls are booked, proposals sent and contracts signed.',
    ],
    how: 'A lead fills in the form at 11pm on a Sunday. Within 60 seconds, they have a personal reply. If they fit the firm’s criteria, that reply comes with a booking link for the right partner. If they don’t, they go into a nurture sequence. After the sales call, the transcript becomes a draft proposal in the firm’s template, and the deal moves through HubSpot on its own as the call is booked, the proposal goes out and the contract is signed.',
    stack: ['HubSpot', 'Claude', 'n8n', 'Calendly', 'Gmail', 'Slack'],
    figures: [
      {
        title: 'Time to first reply',
        before: { label: 'Before', value: '19 hrs', v: 100 },
        after: { label: 'After', value: '<60 s', v: 0.09 },
        note: 'At this scale, the new reply time is a sliver: under a minute against 19 hours.',
      },
    ],
  },
  {
    slug: 'back-office-autopilot',
    placeholder: false,
    clip: 'back-office',
    title: 'Back-office autopilot',
    client: 'IT services company, 30 people',
    service: 'Workflow Automation',
    serviceSlug: 'workflow-automation',
    summary: '62 hours of admin a week handed back to a 30-person team, and invoices that finally go out on time.',
    stats: [
      { value: '62 hrs', label: 'of admin removed every week' },
      { value: '3 days', label: 'to onboard a client, down from 14' },
      { value: '98%', label: 'of invoices out on time, up from 71%' },
    ],
    outcomes: [
      'We removed 62 hours of admin from the team every week.',
      'We cut client onboarding from 14 days to 3.',
      'We got 98% of invoices out on time, up from 71%.',
      'We closed the month four days faster.',
    ],
    challenge:
      'The ops team had become the bottleneck. Onboarding a new client took two weeks of emails and spreadsheets. Monthly reports were built by hand. Invoices went out late because nobody fully trusted the numbers, and everyone was too busy firefighting to fix any of it.',
    built: [
      'Client onboarding runs from a single form: accounts created, documents collected, kickoff booked and the team notified.',
      'Support tickets are triaged automatically the moment they arrive: categorized, prioritized and routed to the right technician with a suggested fix.',
      'Monthly client health reports build themselves from ticket, uptime and billing data, and go out on the first of the month.',
      'Billing checks usage against each contract automatically and flags anything unusual before invoices are sent.',
    ],
    how: 'A new client fills in one form. Their accounts are created, documents requested, the kickoff call booked and the team told, without anyone lifting a finger. Support tickets are categorized, prioritized and routed with a suggested fix the moment they arrive. On the first of every month, client health reports build themselves from ticket, uptime and billing data, and every invoice is checked against its contract before it goes out.',
    stack: ['n8n', 'Make', 'Slack', 'Xero', 'Google Sheets', 'Airtable'],
    figures: [
      {
        title: 'Days to onboard a new client',
        before: { label: 'Before', value: '14 days', v: 100 },
        after: { label: 'After', value: '3 days', v: 21.4 },
      },
      {
        title: 'Invoices out on time',
        before: { label: 'Before', value: '71%', v: 71 },
        after: { label: 'After', value: '98%', v: 98 },
      },
    ],
  },
];
