/**
 * What clients say, in their own words. Real quotes only, used with the client's permission: a name
 * (or initials), their role and the kind of business, as they agreed to be shown. The home page shows
 * a "What clients say" section as soon as there's one here, and none while the list is empty.
 */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  /** The kind of business, or its name if they're happy to be named. */
  company: string;
  /** The case study it belongs to (cases.ts), if there is one: the card links to it. */
  caseSlug?: string;
}

export const testimonials: Testimonial[] = [];
