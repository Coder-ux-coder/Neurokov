import type { IconName } from '../components/icons';

/**
 * No timelines here (the user's call): the promise is results from launch, not how many days it
 * takes to get there.
 */
export const steps: {
  icon: IconName;
  title: string;
  text: string;
  /** The longer version, on the process page. */
  detail: string;
  /** The badge beside each step on the process page. */
  tag: string;
  get: string[];
  /** The step's illustrated film on the process page (clips.ts). */
  clip: string;
}[] = [
  {
    icon: 'calendar-check',
    title: 'Free growth audit',
    text: '30 minutes on Google Meet. We look at where your clients come from today, where leads go cold and where your next clients will come from.',
    detail:
      'Bring the honest version: where your clients come from, how fast you reply to new leads and what happens to the ones who don’t buy. You leave knowing where the quickest new business is, whether you work with us or not.',
    tag: 'No cost',
    clip: 'process-audit',
    get: [
      'Where your leads go cold today',
      'The fastest route to more booked calls',
      'A straight answer on whether we’re the right fit',
    ],
  },
  {
    icon: 'file-signature',
    title: 'Plan and fixed price',
    text: 'You get a written plan: who we’ll reach, what we’ll deliver and one fixed price. No hourly billing, no surprise invoices.',
    detail:
      'It’s written in plain English. The plan spells out who we’ll go after and what we’ll deliver, and it’s what our guarantee is measured against. If we don’t deliver it, you don’t pay.',
    tag: 'One fixed price',
    clip: 'process-scope',
    get: [
      'Your ideal buyers, defined in writing',
      'What we’ll deliver, agreed upfront',
      'One fixed price, before any work starts',
    ],
  },
  {
    icon: 'rocket',
    title: 'Launch',
    text: 'We set everything up, you approve the messaging, and it goes live. From day one, leads get answered and conversations start.',
    detail:
      'The slow parts, like warming up new sending inboxes, happen before launch, so launch day is a real day, not a test. You approve every message before it goes out, and you get a short update every week.',
    tag: 'Live from day one',
    clip: 'process-build',
    get: [
      'Messaging you approve before it goes out',
      'A short update every week',
      'Booked calls landing on your calendar',
    ],
  },
  {
    icon: 'trending-up',
    title: 'Scale what works',
    text: 'Optional monthly plan. We do more of what books calls, drop what doesn’t and keep the calendar full as you grow.',
    detail:
      'Once the first campaign is booking calls, the next move is usually obvious: a new market, a new offer, more volume. Rather run it yourselves? Everything is documented and yours, so you can.',
    tag: 'Optional',
    clip: 'process-support',
    get: [
      'A monthly report on replies, booked calls and new clients',
      'More of what works, less of what doesn’t',
      'A monthly check-in on where to grow next',
    ],
  },
];
