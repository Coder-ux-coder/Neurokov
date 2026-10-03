export interface Faq {
  q: string;
  a: string;
}

/** The five on the homepage. */
export const homeFaqs: Faq[] = [
  {
    q: 'Is the audit really free?',
    a: 'Yes. 100% free, 30 minutes, no strings. You leave with a clear list of what to automate first, whether you work with us or not.',
  },
  {
    q: 'Why should we trust you?',
    a: 'Fair question. We’ve shipped 150+ automations over six years, we’re n8n certified, and we scaled a psychology platform our CEO co-founded by over 100% in a single month, using the same systems we’d build for you. And every build comes with our guarantee: it works, or you don’t pay. The risk sits with us.',
  },
  {
    q: 'How fast will it start working?',
    a: 'Day one. We test every system on your real data before it goes live, so the day we switch it on, it’s already doing the job: answering leads, building the reports, booking the calls. No ramp-up, no “give it a few months”.',
  },
  {
    q: 'What’s your guarantee?',
    a: 'It works, or you don’t pay. Before we build anything, we agree in writing exactly what your system will do. If what we deliver doesn’t do that, you don’t pay for it.',
  },
  {
    q: 'How much does it cost?',
    a: 'Every project gets one fixed price after the free audit, based on what we’re building. No hourly billing, no surprise invoices. You know the number before any work starts.',
  },
];

export const faqGroups: { title: string; items: Faq[] }[] = [
  {
    title: 'Working with us',
    items: [
      {
        q: 'How does a project start?',
        a: 'With a free 30-minute systems audit. We look at how your business runs today, find where the hours and leads leak, and point out the two or three automations with the biggest payoff. If it makes sense to work together, you get a written scope and one fixed price.',
      },
      {
        q: 'Is the audit really free?',
        a: 'Yes. 100% free, no strings. You leave with a clear list of what to automate first, whether you work with us or not.',
      },
      {
        q: 'Why should we trust you?',
        a: 'We’ve shipped 150+ automations over six years and handed 50,000+ hours back to the teams that use them. We’re n8n certified and Claude experts, and we scaled a psychology platform our CEO co-founded by over 100% in a single month, using the same systems we’d build for you. And every build is guaranteed: it works, or you don’t pay.',
      },
      {
        q: 'How fast will it start working?',
        a: 'From day one. Every system is tested on your real data before launch, so it’s doing real work the day it goes live. The launch date is in your scope, so you know exactly when day one is.',
      },
      {
        q: 'Will this replace my team?',
        a: 'No. It replaces the busywork your team hates: copying data between tools, chasing documents, writing the same email for the hundredth time. Your people get their week back for the work you actually hired them to do.',
      },
      {
        q: 'We’re not technical. Is that a problem?',
        a: 'Not at all. You tell us how the work gets done today, in plain English. We handle everything technical, then hand it over with a walkthrough and a handbook written for people, not engineers.',
      },
      {
        q: 'Do you work with healthcare businesses?',
        a: 'Yes. We automated an online psychology platform end to end, from the first enquiry to billing, and the business grew by over 100% in a single month. Anything that touches client data is scoped with you in writing before we build it.',
      },
      {
        q: 'Do you work with companies in other countries?',
        a: 'Yes. We work remotely with businesses in any time zone. Calls happen on Google Meet or Zoom, and most of the work happens without needing meetings at all.',
      },
      {
        q: 'What do you need from our team?',
        a: 'A few hours at the start to walk us through how things work, access to the tools involved, and one person who can make decisions. We handle the rest.',
      },
      {
        q: 'Do you build websites or run ads?',
        a: 'No. We only build automation: systems that bring in leads, follow up on them and run the admin. Doing one thing is how we got good enough at it to guarantee it.',
      },
    ],
  },
  {
    title: 'Pricing and guarantee',
    items: [
      {
        q: 'How much does it cost?',
        a: 'Every project gets a fixed price after the free audit, based on what we’re building. No hourly billing, no surprise invoices. You’ll know the number before any work starts.',
      },
      {
        q: 'What’s your guarantee?',
        a: 'It works, or you don’t pay. Before we start, we agree in writing exactly what your system will do. If what we deliver doesn’t do that, you don’t pay. No fine print, no arguing.',
      },
      {
        q: 'Why would you offer that?',
        a: 'Because we’ve built more than 150 of these. We know what will work before we write the scope, and we only take on projects we’re sure we can deliver. If we’re not sure, we’ll tell you on the audit.',
      },
      {
        q: 'Are there ongoing costs?',
        a: 'Usually small ones. The software your system runs on is billed to you directly, at cost. We estimate those upfront so there are no surprises.',
      },
      {
        q: 'Do you offer ongoing support?',
        a: 'Yes, as an optional monthly plan. We monitor your systems, fix anything that breaks and keep improving them as your business changes.',
      },
    ],
  },
  {
    title: 'Tech and security',
    items: [
      {
        q: 'Which tools do you build with?',
        a: 'Mostly n8n (we’re certified), Make and Zapier, plus Claude for the steps that read or write. On top of that, whatever your team already uses: HubSpot, Google Workspace, Slack, Notion, Airtable and so on.',
      },
      {
        q: 'Do we own what you build?',
        a: 'Yes, all of it. Every workflow, prompt and account is yours, documented and handed over. If we ever part ways, everything keeps running.',
      },
      {
        q: 'Is our data safe?',
        a: 'Systems only get access to the data they need. We use business-grade APIs that don’t train on your data, keep credentials in secure vaults and document where every piece of information flows.',
      },
      {
        q: 'What happens if something breaks?',
        a: 'Every system has error alerts built in, so problems surface fast, usually before anyone on your team notices. On a support plan, fixes are included. Without one, your handbook covers the common fixes, and you can always bring us back in.',
      },
      {
        q: 'We already have some automations. Can you work with them?',
        a: 'Yes. We often start by auditing what’s already there, fixing what’s fragile and building on what works.',
      },
    ],
  },
];
