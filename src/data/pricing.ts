import type { IconName } from '../components/icons';

/**
 * Price bands by scope: with any here, /services/ shows a "What it costs" section and the FAQ's cost
 * answer quotes them. Empty: made-up bands stood here for a day and went at the owner's word
 * (2026-10-10), so the site names no price (one fixed price, agreed after the free audit). To show
 * real prices, fill them in: { scope, range, text, icon }, each one fixed price for the setup and the
 * first 60 days.
 */
export const priceBands: { scope: string; range: string; text: string; icon: IconName }[] = [];

/** Under the bands, while there are any: the rest of what a client pays. */
export const priceNote = '';
