import type { IconName } from '../components/icons';

export const industries: { icon: IconName; title: string; text: string; tags: string[] }[] = [
  {
    icon: 'heart-pulse',
    title: 'Healthcare & mental health',
    text: 'New clients in, and every enquiry answered and booked. We did it for an online psychology platform, and the business more than doubled in a month.',
    tags: ['New Clients', 'Enquiries Answered', 'Booked Sessions'],
  },
  {
    icon: 'palette',
    title: 'Marketing & creative agencies',
    text: 'A pipeline that doesn’t depend on referrals: qualified calls with the companies you want to work with, every month.',
    tags: ['Booked Calls', 'Outbound', 'Referral-Proof Pipeline'],
  },
  {
    icon: 'briefcase-business',
    title: 'Consulting firms',
    text: 'Every inbound lead answered in under a minute, and calls with the decision-makers you want in front of.',
    tags: ['Speed to Lead', 'Decision-Makers', 'Follow-ups'],
  },
  {
    icon: 'server',
    title: 'IT services & MSPs',
    text: 'Calls with companies that need IT help now, not a list of names to chase.',
    tags: ['Booked Calls', 'Outbound', 'Renewals'],
  },
  {
    icon: 'users',
    title: 'Recruiting & staffing',
    text: 'New hiring clients booked onto your calendar, and past clients back when they’re hiring again.',
    tags: ['New Clients', 'Outbound', 'Reactivation'],
  },
  {
    icon: 'calculator',
    title: 'Accounting & bookkeeping',
    text: 'New business clients booked in before the busy season, and old enquiries turned into engagements.',
    tags: ['Booked Calls', 'Reactivation', 'Follow-ups'],
  },
  {
    icon: 'scale',
    title: 'Law firms',
    text: 'Every enquiry answered in under a minute, so the client books with you, not the next firm on the list.',
    tags: ['Speed to Lead', 'Booked Consultations', 'Follow-ups'],
  },
  {
    icon: 'graduation-cap',
    title: 'Coaching & training',
    text: 'Discovery calls on your calendar every week, and past clients back for the next program.',
    tags: ['Discovery Calls', 'Reactivation', 'Follow-ups'],
  },
  {
    icon: 'landmark',
    title: 'Financial advisors',
    text: 'Introductory meetings with the clients you want, booked for you, so advisors spend their time advising.',
    tags: ['Booked Meetings', 'Outbound', 'Reactivation'],
  },
];
