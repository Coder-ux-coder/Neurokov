export interface Faq {
  q: string;
  a: string;
}

/** The five on the homepage. */
export const homeFaqs: Faq[] = [
  {
    q: 'Is the audit really free?',
    a: 'Yes. 100% free, 30 minutes, no strings. You leave knowing where your next clients can come from and what we’d do first, whether you work with us or not.',
  },
  {
    q: 'Why should we trust you?',
    a: 'Fair question. We booked a growth agency 46 qualified calls in its first 30 days, cut a consulting firm’s first reply from 19 hours to under 60 seconds, and grew a psychology platform our CEO co-founded by over 100% in a single month. And everything we do comes with our guarantee: results, or you don’t pay. The risk sits with us.',
  },
  {
    q: 'How soon will we see results?',
    a: 'Fast. Inbound leads get a reply in under a minute from the day we launch, and outbound starts sending on day one, because the slow setup work happens before launch. One agency had 46 qualified calls in its first 30 days.',
  },
  {
    q: 'What’s your guarantee?',
    a: 'Results, or you don’t pay. Before we start, we agree in writing exactly what we’ll deliver. If we don’t deliver it, you don’t pay for it.',
  },
  {
    q: 'How much does it cost?',
    a: 'One fixed price, agreed after the free audit, based on what we’re delivering. No hourly billing, no surprise invoices. You know the number before any work starts.',
  },
];

export const faqGroups: { title: string; items: Faq[] }[] = [
  {
    title: 'Working with us',
    items: [
      {
        q: 'How does it start?',
        a: 'With a free 30-minute growth audit. We look at where your clients come from today, where leads go cold and which of our services would bring you the most new business. If it makes sense to work together, you get a written plan and one fixed price.',
      },
      {
        q: 'Is the audit really free?',
        a: 'Yes. 100% free, no strings. You leave knowing where your next clients can come from, whether you work with us or not.',
      },
      {
        q: 'Why should we trust you?',
        a: 'Look at the numbers. 46 qualified calls in 30 days for a growth agency. A consulting firm’s first reply cut from 19 hours to under 60 seconds, and its close rate up by over 20% in a quarter. A psychology platform our CEO co-founded grown by over 100% in a single month. And everything we do is guaranteed: results, or you don’t pay.',
      },
      {
        q: 'How soon will we see results?',
        a: 'From launch. Inbound leads get a reply in under a minute from day one, and outbound starts sending the day we go live. The launch date is in your plan, so you know exactly when day one is.',
      },
      {
        q: 'Who do you work with?',
        a: 'B2B service businesses that sell expertise: agencies, consulting firms, IT companies, healthcare businesses and more. If you’re great at the work and want more of it, we’re built for you.',
      },
      {
        q: 'Do we need a sales team?',
        a: 'No. We find the buyers and book the calls. You show up and close. One growth agency got 46 qualified calls in its first 30 days with zero sales hires.',
      },
      {
        q: 'Do you work with healthcare businesses?',
        a: 'Yes. We grew an online psychology platform by over 100% in a single month, bringing new clients in and turning every enquiry into a booked session. Anything that touches client data is agreed with you in writing first.',
      },
      {
        q: 'Do you work with companies in other countries?',
        a: 'Yes. We work remotely with businesses in any time zone. Calls happen on Google Meet or Zoom, and most of the work happens without needing meetings at all.',
      },
      {
        q: 'What do you need from us?',
        a: 'A short call to learn who you sell to and what makes you different, a say in the messaging before it goes out, and someone to take the calls. We handle the rest.',
      },
      {
        q: 'Do you build websites or run ads?',
        a: 'No. We do one thing: get you new clients, through outbound, fast replies to the leads you already get, and winning back old ones. Doing one thing is how we got good enough at it to guarantee it.',
      },
    ],
  },
  {
    title: 'Pricing and guarantee',
    items: [
      {
        q: 'How much does it cost?',
        a: 'One fixed price, agreed after the free audit, based on what we’re delivering. No hourly billing, no surprise invoices. You’ll know the number before any work starts.',
      },
      {
        q: 'What’s your guarantee?',
        a: 'Results, or you don’t pay. Before we start, we agree in writing exactly what we’ll deliver. If we don’t deliver it, you don’t pay. No fine print, no arguing.',
      },
      {
        q: 'Why would you offer that?',
        a: 'Because we know what works before we write the plan, and we only take on businesses we’re sure we can help. If we’re not sure, we’ll tell you on the audit.',
      },
      {
        q: 'Are there ongoing costs?',
        a: 'Usually small ones. The tools and sending inboxes your campaigns run on are billed to you directly, at cost. We estimate them upfront so there are no surprises.',
      },
      {
        q: 'Do you keep improving it?',
        a: 'Yes, on an optional monthly plan. We do more of what books calls and drop what doesn’t, and you get a simple report on replies, booked calls and new clients.',
      },
    ],
  },
  {
    title: 'Data and trust',
    items: [
      {
        q: 'Do we own everything?',
        a: 'Yes. Your contact lists, messages, domains and accounts are yours. If we ever part ways, you keep all of it.',
      },
      {
        q: 'Is our data safe?',
        a: 'We only get access to the data we need, keep logins in secure vaults and document where every piece of information goes.',
      },
      {
        q: 'Will cold email hurt our reputation?',
        a: 'Not the way we do it. Every message is relevant, short and easy to opt out of, and we send from separate domains, so your main domain is never at risk.',
      },
      {
        q: 'We already do some outreach. Can you work with it?',
        a: 'Yes. We often start by looking at what you’re already doing, keeping what works and fixing what isn’t booking calls.',
      },
    ],
  },
];
