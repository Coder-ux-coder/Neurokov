import type { IconName } from '../components/icons';

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
  included: { title: string; text: string }[];
  flow: { title: string; caption: string; steps: string[] };
  tools: string[];
  faqs: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
}

export const services: Service[] = [
  {
    slug: 'workflow-automation',
    name: 'Workflow Automation',
    icon: 'workflow',
    card: 'Your repetitive work, done end to end by systems your team never has to babysit.',
    title: 'Workflow automation.',
    sub: 'Done-for-you systems that take the repetitive work off your team for good. We used them to grow a psychology platform by over 100% in one month.',
    signs: [
      'Your best people lose hours every week copying data from one tool to another.',
      'Reports get built by hand, and they’re out of date by the time anyone reads them.',
      'Onboarding a new client means a week of emails, folders and reminders.',
      'Things slip through the cracks, and you find out when a client complains.',
    ],
    intro: [
      'We don’t bolt a tool onto a broken process. We map how work actually moves through your business, find the steps where people copy, paste, check and chase, and hand those steps to systems that run them the same way every time.',
      'Every build is scoped upfront and tested on your real data before it goes live, so it works from day one. And it’s documented, so your team still understands it a year from now.',
      'This is where we started, back in 2020. More than 150 automations later, we know which ones pay for themselves and which ones only look good in a demo. We build the first kind.',
    ],
    included: [
      {
        title: 'Process mapping',
        text: 'We sit with your team, map the workflow start to finish and rank every step by how much time it eats.',
      },
      {
        title: 'Custom builds',
        text: 'Automations built around your tools, your data and your rules. Not a template with your logo on it.',
      },
      {
        title: 'Reading and drafting, built in',
        text: 'Steps that read, sort, summarize and draft, wherever they save real time. Plain logic everywhere else, because it’s cheaper and it never guesses.',
      },
      {
        title: 'Tested on your real data',
        text: 'Before launch, your real records run through the system. Edge cases get caught in testing, not by your clients.',
      },
      {
        title: 'Error alerts built in',
        text: 'If anything looks off, the system tells us straight away, usually before your team would notice.',
      },
      {
        title: 'A handbook people read',
        text: 'Every system ships with a plain-English handbook and a walkthrough, so your team knows exactly what it does.',
      },
    ],
    flow: {
      title: 'Client onboarding, on autopilot',
      caption:
        'A typical first build. What used to take a week of back-and-forth emails now happens in the ten minutes after a contract is signed.',
      steps: [
        'Contract signed',
        'Workspace and folders created',
        'Welcome pack drafted',
        'Kickoff call booked',
        'Team briefed in Slack',
      ],
    },
    tools: ['n8n', 'Make', 'Zapier', 'Claude', 'Google Sheets', 'Gmail', 'Airtable', 'Notion'],
    faqs: [
      {
        q: 'What can you actually automate?',
        a: 'Anything your team does the same way more than a few times a week. Data entry, reporting, onboarding, scheduling, invoicing, document handling. If it follows rules, a system can run it.',
      },
      {
        q: 'Do we have to switch tools?',
        a: 'Almost never. We build on top of what you already use. If a tool is genuinely holding you back, we’ll tell you, and explain why.',
      },
      {
        q: 'How fast does it start working?',
        a: 'Day one. We test on your real data before launch, so the system is doing real work the day it goes live. No ramp-up period.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'Then you don’t pay. We agree in writing what the system will do before we build it. If it doesn’t do that, that’s on us, not you.',
      },
      {
        q: 'What happens when something breaks?',
        a: 'You’ll know before it matters. Every system has error alerts built in, and our optional support plan covers fixes and improvements.',
      },
    ],
    metaTitle: 'Workflow Automation Services for B2B Service Businesses | Neurokov',
    metaDescription:
      'Custom workflow automation that takes repetitive work off your team: onboarding, reporting, data entry and more. Fixed price, works from day one, or you don’t pay.',
  },
  {
    slug: 'lead-generation',
    name: 'Automated Lead Generation',
    icon: 'target',
    card: 'Cold email and outbound that finds your buyers and puts calls on your calendar.',
    title: 'Automated lead generation.',
    sub: 'Done-for-you outbound that finds your buyers, writes like a human and puts qualified calls on your calendar. 46 in the first 30 days for one agency.',
    signs: [
      'Your pipeline runs on referrals, so some months are packed and others are silent.',
      'You’ve tried cold email before, and it burned a domain or booked nothing.',
      'The founders are still the only ones selling, squeezing prospecting in after client work.',
      'Hiring a sales rep feels slow, expensive and risky.',
    ],
    intro: [
      'Most outbound fails for boring reasons. Bad lists, generic emails, burned domains and replies nobody answers for two days.',
      'We build the whole engine properly: tight targeting, verified contacts, emails that read like a person wrote them, sending infrastructure that protects your main domain, and replies routed to you the minute they land.',
      'You don’t need a sales team to run it. The system finds the accounts, writes the emails and sorts the replies. Your job is to show up to the calls.',
    ],
    included: [
      {
        title: 'Lists that fit',
        text: 'We define who actually buys from you, then build and verify lists of those companies and the people who make the call.',
      },
      {
        title: 'Personal, at scale',
        text: 'Every prospect is researched automatically, and every email opens with a line that proves you looked. Thousands of emails, none of them reading like a template.',
      },
      {
        title: 'Sequences that get replies',
        text: 'We write the sequences with you, test different angles and keep what works. No “just bumping this up” follow-ups.',
      },
      {
        title: 'Deliverability, done right',
        text: 'Separate sending domains, warmed inboxes and proper DNS, so your emails land in the inbox and your main domain stays clean.',
      },
      {
        title: 'Replies handled in seconds',
        text: 'Replies are sorted by intent the moment they arrive. Interested leads get a booking link, you get a heads-up, and the rest is handled for you.',
      },
      {
        title: 'Numbers you can see',
        text: 'Sends, replies and booked calls in one simple report, so you always know what the engine is producing.',
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
    tools: ['Apollo', 'Clay', 'Instantly', 'Claude', 'n8n', 'HubSpot', 'Gmail'],
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
        a: 'We write the sequences with you, test different angles and keep what works. The system handles the personal touches. Humans handle the strategy.',
      },
      {
        q: 'How fast does it start working?',
        a: 'The day it launches, it’s sending. The slow parts, like warming up new inboxes, happen before launch, so day one is a real sending day, not a test.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'Then you don’t pay. We agree in writing what the engine will do before we build it. If it doesn’t do that, that’s on us.',
      },
      {
        q: 'Is cold email legal?',
        a: 'B2B cold email is legal in most markets when you follow the rules: honest subject lines, real sender details and an easy way to opt out. We build all of that in and flag anything specific to your market.',
      },
    ],
    metaTitle: 'Automated Lead Generation and Cold Email Systems | Neurokov',
    metaDescription:
      'Outbound systems that find your buyers, personalize every email automatically and book qualified calls on your calendar, without risking your main domain.',
  },
  {
    slug: 'automation-agents',
    name: 'Custom Automation Agents',
    icon: 'bot',
    card: 'Automated assistants that read, sort, write and reply, with a human signing off where it counts.',
    title: 'Custom automation agents.',
    sub: 'Done-for-you automation agents that handle a job from start to finish, with a person signing off wherever a mistake would be expensive.',
    signs: [
      'Your inbox runs your day, and most of what’s in it doesn’t need you.',
      'New leads wait hours for a reply because nobody’s free to answer.',
      'Your team answers the same client questions again and again.',
      'You’ve tried off-the-shelf tools, but they don’t know your business, your clients or your rules.',
    ],
    intro: [
      'An automation agent is software that can take a task all the way through on its own. Read an inbox. Qualify a lead. Answer a client’s question. Prepare a meeting brief.',
      'We build agents around one clear job at a time, give them access to only what they need, and add approval steps anywhere you want a human to have the final say.',
      'We’re Claude experts, and we’ve been building automations since 2020. That’s the difference between an agent that does the job every day and one that only works in the demo.',
    ],
    included: [
      {
        title: 'Inbox agents',
        text: 'Sorts incoming email, drafts replies in your voice and flags the handful of messages that actually need you.',
      },
      {
        title: 'Lead qualifiers',
        text: 'Replies to new leads within a minute, asks the right questions and books the good ones straight onto your calendar.',
      },
      {
        title: 'Knowledge assistants',
        text: 'Answers questions from your team or clients using your own documents, SOPs and past work. No more digging through folders.',
      },
      {
        title: 'Meeting prep',
        text: 'Before every call, a one-page brief on who you’re meeting, what they’ve said before and what they’re likely to ask.',
      },
      {
        title: 'Human in the loop',
        text: 'Nothing sensitive goes out without a person approving it. You set the rules, the agent follows them.',
      },
      {
        title: 'A record of everything',
        text: 'Every action the agent takes is logged, so you can see exactly what it did and why.',
      },
    ],
    flow: {
      title: 'An inbox agent',
      caption: 'Your inbox, handled. You approve the replies that matter in one click.',
      steps: [
        'New email arrives',
        'Read and classified',
        'Drafts a reply in your voice',
        'You approve in one click',
        'Sent and logged in your CRM',
      ],
    },
    tools: ['n8n', 'Claude', 'Gmail', 'HubSpot', 'Notion', 'Airtable', 'Google Sheets', 'Slack'],
    faqs: [
      {
        q: 'Could the agent say something wrong to a client?',
        a: 'Not if it’s built properly. Agents work from information you’ve approved, and anything client-facing can require a human’s OK before it goes out.',
      },
      {
        q: 'Which tools does it run on?',
        a: 'Whatever fits the job. Usually n8n and Claude, with simpler, cheaper tools for simple tasks. You’re never locked into one provider.',
      },
      {
        q: 'Is our data safe?',
        a: 'Agents only get access to the tools and data they need. We use business APIs that don’t train on your data, and we document exactly where every piece of information goes.',
      },
      {
        q: 'How fast does it start working?',
        a: 'Day one. We test the agent on your real emails, leads and documents before launch, so it’s doing the job the day it goes live.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'You don’t pay. Before we build, we agree in writing exactly what the agent will handle. If it doesn’t handle it, the cost is ours.',
      },
    ],
    metaTitle: 'Custom Automation Agents for Service Businesses | Neurokov',
    metaDescription:
      'Automation agents that handle inboxes, qualify leads and answer questions from your own documents, with human approval wherever it matters.',
  },
  {
    slug: 'crm-sales-automation',
    name: 'CRM & Sales Automation',
    icon: 'handshake',
    card: 'Every lead followed up, every deal updated, every proposal out the same day.',
    title: 'CRM & sales automation.',
    sub: 'Every lead answered in under a minute, every deal updated and every proposal out the same day. One consulting firm closed 31% more.',
    signs: [
      'New leads wait hours, sometimes days, for a first reply.',
      'Nobody trusts the CRM, so everyone keeps their own spreadsheet.',
      'Proposals get written from scratch, late at night, days after the call.',
      'Good deals go quiet because nobody followed up.',
    ],
    intro: [
      'Deals rarely die because the offer was wrong. They die because nobody followed up, the CRM was three weeks out of date, or the proposal took a week to write.',
      'We automate the boring parts of selling. Your pipeline stays clean, and every lead gets a fast reply, whether it lands at 2pm on a Tuesday or 11pm on a Sunday.',
      'For one consulting firm, that meant going from a 19-hour first reply to under 60 seconds, and a close rate that went up 31% in a single quarter.',
    ],
    included: [
      {
        title: 'Speed to lead',
        text: 'New inquiries get a personal reply in under a minute, day or night, and the good ones get booked straight in.',
      },
      {
        title: 'Follow-ups that never slip',
        text: 'Sequences that nudge leads at the right moments and stop the second someone replies.',
      },
      {
        title: 'A CRM that updates itself',
        text: 'Calls, emails and meetings logged automatically. Deals move stages when things actually happen, not when someone remembers.',
      },
      {
        title: 'Proposals in minutes',
        text: 'Your call notes become a draft proposal in your format, ready for you to review and send the same day.',
      },
      {
        title: 'Leads to the right person',
        text: 'Every lead is routed by rules you set, like service, size or location, so the right person picks it up the first time.',
      },
      {
        title: 'A pipeline you can trust',
        text: 'Duplicates merged, stages that mean something and unused fields cleared out, so your numbers are finally real.',
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
    tools: ['HubSpot', 'Pipedrive', 'GoHighLevel', 'Salesforce', 'Cal.com', 'Gmail', 'n8n', 'Make'],
    faqs: [
      {
        q: 'Which CRMs do you work with?',
        a: 'HubSpot, Pipedrive, GoHighLevel, Salesforce, Close and most others with an API. If your team lives in spreadsheets, we can work with that too, or help you move.',
      },
      {
        q: 'Will leads know it’s automated?',
        a: 'Only if you want them to. Messages are written in your voice and sent from real people’s accounts. Anything complex is handed to a human.',
      },
      {
        q: 'Can you clean up the CRM we already have?',
        a: 'Yes. Most projects start there. Duplicates merged, stages simplified and the fields nobody uses cleared out.',
      },
      {
        q: 'How fast does it start working?',
        a: 'Day one. The first lead that comes in after launch gets its reply in under a minute, because we’ve already run the whole flow on your real leads in testing.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'Then you don’t pay. We agree in writing what the system will do before we build it. If it doesn’t do that, that’s on us.',
      },
    ],
    metaTitle: 'CRM and Sales Automation | Neurokov',
    metaDescription:
      'Speed-to-lead replies in under a minute, follow-ups that never slip, a CRM that updates itself and proposals out the same day.',
  },
  {
    slug: 'marketing-automation',
    name: 'Marketing Automation',
    icon: 'megaphone',
    card: 'Nurture, content and reporting that keep your marketing running while you’re busy with clients.',
    title: 'Marketing automation.',
    sub: 'Done-for-you nurture, content and reporting systems that keep your marketing running, even in the months you’re too busy to think about it.',
    signs: [
      'Marketing stops every time you get busy with clients.',
      'Leads who weren’t ready to buy never hear from you again.',
      'You know you should post more, but there’s never time to write.',
      'Nobody can say which channel actually brings in clients.',
    ],
    intro: [
      'Most service businesses market in bursts. Busy with clients, marketing stops. Pipeline dries up, marketing starts again. It’s a feast-or-famine loop, and it’s exhausting.',
      'We build systems that keep marketing moving however busy you get: nurture sequences that warm leads up over months, content workflows that turn one idea into a week of posts, and reports that show what’s actually working.',
      'You stay in control of everything that goes out. The systems do the writing, the scheduling and the number-crunching. You approve, then get back to your clients.',
    ],
    included: [
      {
        title: 'Lead nurture',
        text: 'Email sequences that keep you top of mind with every lead who isn’t ready yet, triggered by what they actually do.',
      },
      {
        title: 'Content workflows',
        text: 'One call, video or voice note becomes LinkedIn posts, a newsletter and short-form scripts. Your voice stays intact.',
      },
      {
        title: 'Reporting on autopilot',
        text: 'Numbers from every channel pulled into one simple report, in your inbox before Monday’s meeting.',
      },
      {
        title: 'Reactivation campaigns',
        text: 'Campaigns that wake up past clients and old leads. The cheapest pipeline most firms never touch.',
      },
      {
        title: 'Emails that fire on cue',
        text: 'Messages that go out when something happens: a lead downloads a guide, a proposal goes quiet, a client hits a milestone.',
      },
      {
        title: 'Clean contact lists',
        text: 'Contacts, lists and tags cleaned up and synced across your tools, so every campaign reaches the right people.',
      },
    ],
    flow: {
      title: 'One idea, a week of content',
      caption: 'Ten minutes of talking becomes a week of posts in your voice. You approve, the system publishes.',
      steps: [
        'Record a 10-minute voice note',
        'Transcribed and outlined',
        'Drafts posts in your voice',
        'You review and approve',
        'Scheduled across channels',
      ],
    },
    tools: ['HubSpot', 'Mailchimp', 'Claude', 'Notion', 'n8n', 'Make', 'Google Analytics'],
    faqs: [
      {
        q: 'Will automated posts actually sound like us?',
        a: 'It will if it’s set up properly. We build from your past posts, calls and emails, and nothing is published without a human reading it first.',
      },
      {
        q: 'Do you run our ads or social accounts?',
        a: 'No. We build the systems your team or agency uses to run them faster. You keep full control of every account.',
      },
      {
        q: 'How do we know it’s working?',
        a: 'We agree on the numbers upfront, things like booked calls, replies or hours saved, and the reporting tracks them from day one.',
      },
      {
        q: 'How fast does it start working?',
        a: 'Day one. Sequences, content workflows and reports are all tested before launch, so they’re running the day they go live.',
      },
      {
        q: 'What if it doesn’t work?',
        a: 'You don’t pay. We agree in writing what the system will do before we build it, and if it doesn’t do that, the cost is ours.',
      },
    ],
    metaTitle: 'Marketing Automation for Service Businesses | Neurokov',
    metaDescription:
      'Lead nurture, content workflows, reactivation campaigns and automatic reporting that keep your marketing running while you serve clients.',
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
