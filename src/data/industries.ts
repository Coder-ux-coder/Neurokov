import type { IconName } from '../components/icons';

export const industries: { icon: IconName; title: string; text: string; tags: string[] }[] = [
  {
    icon: 'heart-pulse',
    title: 'Healthcare & mental health',
    text: 'Intake, booking, reminders, billing and follow-ups that run on their own. We did it for an online psychology platform, and the business more than doubled in a month.',
    tags: ['Client Intake', 'Booking & Reminders', 'Billing'],
  },
  {
    icon: 'palette',
    title: 'Marketing & creative agencies',
    text: 'Client reporting that builds itself, onboarding that runs without a project manager and outbound that keeps the pipeline full between referrals.',
    tags: ['Cold Email', 'Client Reporting', 'Onboarding'],
  },
  {
    icon: 'briefcase-business',
    title: 'Consulting firms',
    text: 'Leads answered in under a minute, proposals drafted from your call notes and follow-ups that never slip.',
    tags: ['Speed to Lead', 'Proposal Drafts', 'Follow-ups'],
  },
  {
    icon: 'server',
    title: 'IT services & MSPs',
    text: 'Ticket triage, client health reports and renewal reminders, handled before anyone has to ask.',
    tags: ['Ticket Triage', 'SLA Reports', 'Renewals'],
  },
  {
    icon: 'users',
    title: 'Recruiting & staffing',
    text: 'Candidate sourcing, screening and outreach at a volume no recruiter could keep up with by hand.',
    tags: ['Sourcing', 'Screening', 'Candidate Outreach'],
  },
  {
    icon: 'calculator',
    title: 'Accounting & bookkeeping',
    text: 'Document collection, invoice chasing and month-end checklists that run on their own, every single month.',
    tags: ['Doc Collection', 'Invoice Chasing', 'Month-End'],
  },
  {
    icon: 'scale',
    title: 'Law firms',
    text: 'Client intake, engagement letters and matter updates without the admin pile-up.',
    tags: ['Client Intake', 'Document Drafting', 'Matter Updates'],
  },
  {
    icon: 'graduation-cap',
    title: 'Coaching & training',
    text: 'Enrollment, session scheduling and follow-ups that turn one-off clients into long-term ones.',
    tags: ['Enrollment', 'Scheduling', 'Nurture'],
  },
  {
    icon: 'landmark',
    title: 'Financial advisors',
    text: 'Client onboarding, meeting prep and compliant follow-ups, so advisors spend their time advising.',
    tags: ['Onboarding', 'Meeting Prep', 'CRM Hygiene'],
  },
];
