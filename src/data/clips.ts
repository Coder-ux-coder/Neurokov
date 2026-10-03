/**
 * The story clips: illustrated films made in design/clips and rendered into
 * src/assets/clips by render.mjs --install. `text` says what happens in each,
 * for screen readers and for anyone who can't watch. Case clips use only the
 * numbers confirmed in cases.ts; a service clip that borrows a case's numbers
 * names it in `source`. Service clips are named after the service's slug.
 */
export const clips: Record<string, { title: string; text: string; source?: string }> = {
  'speed-to-lead': {
    title: 'Speed-to-lead, as a story',
    text: 'Illustrated story, with real numbers from case 03. A lead writes in at 11:47 PM. The old way, the first reply took 19 hours. With Neurokov, the reply goes out in under 60 seconds and the call is booked by morning.',
  },
  'outbound-engine': {
    title: 'The outbound engine, as a story',
    text: 'Illustrated story, with real numbers from case 02. An agency that lived on referrals had great months, then quiet ones, and cold email burned a domain twice. The engine finds companies that fit, writes a first line about something real, sends from warmed inboxes away from the main domain and sorts the replies: 46 qualified calls in the first 30 days, with zero sales hires.',
  },
  'back-office': {
    title: 'The back-office autopilot, as a story',
    text: 'Illustrated story, with real numbers from case 04. The ops team had become the bottleneck, and onboarding a client took 14 days. Now one form sets everything up and onboarding takes 3 days, the support tickets are triaged on arrival, and 98% of invoices go out on time, up from 71%: 62 hours of admin gone every week.',
  },
  psychology: {
    title: 'The psychology platform, as a story',
    text: 'Illustrated story, with real numbers from case 01. Every new client at an online psychology platform meant more admin, and the admin put a ceiling on growth. Automated end to end, from the first enquiry to the final invoice, the business grew by over 100% in a single month.',
  },
  welcome: {
    title: 'Welcome to Neurokov',
    text: 'Illustrated story. NK-01, the Neurokov robot, says hello. Busywork piles up on a desk until NK-01 clears it. Then the scope is agreed in writing and stamped: it works, or you don’t pay. Start with a free audit.',
  },
  'workflow-automation': {
    title: 'Client onboarding, as a story',
    text: 'Illustrated story. Every new client means a week of emails, folders and reminders, and whoever handles onboarding runs out of hands. With Neurokov, NK-01 runs the system step by step: the contract is signed, the workspace and folders are created, the welcome pack is drafted, the kickoff call is booked and the team is briefed in Slack. Every client, every time.',
  },
  'lead-generation': {
    title: 'Automated lead generation, as a story',
    text: 'Illustrated story, with real numbers from case 02. A founder squeezes prospecting in after client work and falls asleep at the laptop. With Neurokov, six steps run every weekday: find ideal accounts, enrich and verify them, write a personal first line, send from warmed inboxes, sort the replies by intent and book the call. In case 02 that meant 46 qualified calls in the first 30 days, with zero sales hires.',
    source: 'case 02',
  },
  'automation-agents': {
    title: 'An inbox agent, as a story',
    text: 'Illustrated story. The inbox spits out mail until its owner is buried to the waist. With Neurokov, an agent handles it in five steps: a new email arrives, it is read and classified, a reply is drafted in your voice, you approve it in one click, and it is sent and logged in your CRM. Your inbox, handled.',
  },
  'crm-sales-automation': {
    title: 'Speed to lead, as a story',
    text: 'Illustrated story, with real numbers from case 03. New leads pour into a funnel full of cracks, and most of them roll away. With Neurokov, every lead goes through five steps: the form is submitted, the lead is checked and qualified, a personal reply goes out within 60 seconds, the call is booked on your calendar, and the CRM is updated and the team notified. In case 03 the first reply went from 19 hours to under 60 seconds.',
    source: 'case 03',
  },
  'process-audit': {
    title: 'Step 01, the free audit, as a story',
    text: 'Illustrated story. The business as a pipeline, from leads to sales, ops and billing, leaking at three joints. NK-01 goes along it with a magnifier, flags the leaks in order of payoff and hands over the plan.',
  },
  'process-scope': {
    title: 'Step 02, the scope and fixed price, as a story',
    text: 'Illustrated story. NK-01 writes the scope line by line and a fixed-price sticker goes on it. The client walks in, reads it and signs, and the stamp comes down: agreed.',
  },
  'process-build': {
    title: 'Step 03, build and launch, as a story',
    text: 'Illustrated story. The system is built block by block. A test run with real data turns up one bad result, NK-01 fixes it, the second run is clean, and NK-01 presses Go live. From then on every item comes out done.',
  },
  'process-support': {
    title: 'Step 04, support and improve, as a story',
    text: 'Illustrated story. The client enjoys a coffee while NK-01 watches the dashboard. An alert rings, NK-01 fixes it before anyone notices, then plugs in an improvement and the hours-saved chart climbs.',
  },
  about: {
    title: 'Neurokov since 2020, as a story',
    text: 'Illustrated story, with our real numbers. In 2020 NK-01 switches on at a workbench and builds its first automation. Then a whole wall of them appears as the count runs to 150+ automations shipped and 50K+ hours handed back. It works, or you don’t pay.',
  },
  founder: {
    title: 'Mohid Zeeshan, our founder, as a story',
    text: 'Illustrated story. Mohid, Neurokov’s founder, tells Claude Code to automate his week, and an n8n workflow builds itself: his inbox, calendar, invoices and reports run on their own. He climbs a pyramid of people who build automations, all the way to the top 1%, then shares what works with the automation communities he’s part of. Your systems, built by the top 1%.',
  },
  'not-found': {
    title: 'A broken link, as a story',
    text: 'Illustrated story. A link has snapped and the signals die at the gap, until NK-01 grabs both ends and becomes the link, and they run on through to home.',
  },
  'marketing-automation': {
    title: 'One idea, a week of content, as a story',
    text: 'Illustrated story. Another week goes by with nothing posted: a line typed and deleted, every day crossed off. With Neurokov, a 10-minute voice note becomes a week of posts: it is transcribed and outlined, drafts posts in your voice, you review and approve them, and they are scheduled across channels.',
  },
};
