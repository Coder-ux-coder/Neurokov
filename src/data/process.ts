import type { IconName } from '../components/icons';

/**
 * No build durations here (the user's call): the promise is that a system works
 * from the day it goes live, not how many days it takes to get there.
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
    title: 'Free systems audit',
    text: '30 minutes, 100% free. We map where your hours and leads leak, find the bottlenecks and show you exactly what to automate first.',
    detail:
      'Bring the messy version: how leads come in, what happens to them next and where your team’s week actually goes. We ask the questions that surface the expensive problems, and you leave with a plan whether you work with us or not.',
    tag: '100% free',
    clip: 'process-audit',
    get: [
      'A map of where your team’s hours actually go',
      'The two or three automations with the biggest payoff',
      'A straight answer on whether we’re the right fit',
    ],
  },
  {
    icon: 'file-signature',
    title: 'Scope and fixed price',
    text: 'You get a written scope: exactly what we’ll build, what it will do and one fixed price. No hourly billing, no surprise invoices.',
    detail:
      'It’s written in plain English, not jargon. The scope spells out what the finished system does, and it’s what our guarantee is measured against. If what we deliver doesn’t do what the scope says, you don’t pay.',
    tag: 'One fixed price',
    clip: 'process-scope',
    get: [
      'A written scope with every step itemized',
      'One fixed price, agreed before any work starts',
      'Ideas for phase two, if they’re worth doing',
    ],
  },
  {
    icon: 'rocket',
    title: 'Build and launch',
    text: 'We build it, test it on your real data and switch it on. It works from day one: no ramp-up, no “give it 90 days”.',
    detail:
      'You get a short update every week while we build, so you always know where things stand. Before launch, we run your real leads, emails and records through the system and fix anything that trips it up. Launch day is when the work starts getting done, not when the testing starts.',
    tag: 'Works from day one',
    clip: 'process-build',
    get: [
      'A short progress update every week',
      'Testing on your real data before anything goes live',
      'A handbook and a walkthrough for your team',
    ],
  },
  {
    icon: 'life-buoy',
    title: 'Support and improve',
    text: 'Optional monthly support. We watch your systems, fix anything that breaks and keep improving them as you grow.',
    detail:
      'Once the first system is running, the next one is usually obvious. Support keeps what you have in shape and gives you a team for whatever comes next. Rather run it yourselves? Everything is documented and yours, so you can.',
    tag: 'Optional',
    clip: 'process-support',
    get: [
      'Monitoring and error alerts on every system',
      'Fixes and small improvements included',
      'A monthly check-in on what to automate next',
    ],
  },
];
