/**
 * The guarantee's terms, published so a buyer can see what "results, or you don't pay" means before the
 * call. Written on 2026-10-10 at the owner's request and confirmed by the owner for launch the same day.
 * Emptying the list takes them off the banner, the FAQ and /terms/.
 *
 * The promise itself is the owner's: "Results, or you don't pay". Never "refund" or "money back"
 * (the owner's rule).
 */
export const guaranteeTerms: { term: string; text: string }[] = [
  {
    term: 'What counts',
    text: 'The number in your plan, such as qualified calls: a decision-maker at a business that fits the profile we agreed, who turns up.',
  },
  {
    term: 'Who judges',
    text: 'Your own calendar and CRM, which you can check any time. If you don’t count a call as qualified, neither do we.',
  },
  {
    term: 'By when',
    text: 'Within 60 days of launch. Nothing is invoiced until the number is met. If it isn’t, you don’t pay for the work.',
  },
  {
    term: 'Not covered',
    text: 'The tools and sending inboxes, billed to you at cost, calls you don’t take, and changes to your offer partway through.',
  },
];
