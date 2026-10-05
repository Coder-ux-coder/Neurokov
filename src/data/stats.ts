/**
 * Hero numbers, all from the confirmed case studies (cases.ts): the calls are case 02's, the reply
 * time and close rate case 03's, the growth the psychology platform Mohid co-founded. Set
 * `statsArePlaceholders` to true if any of these become unconfirmed: that marks them data-ph and
 * blocks the build.
 */
export const statsArePlaceholders = false;

export interface Stat {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export const heroStats: Stat[] = [
  { value: 46, label: 'qualified calls in 30 days' },
  { value: 60, prefix: '<', suffix: 's', label: 'first reply to a new lead' },
  { value: 31, suffix: '%', label: 'higher close rate' },
  { value: 100, suffix: '%+', label: 'growth in one month' },
];

export const formatStat = (s: Stat) => `${s.prefix ?? ''}${s.value.toFixed(s.decimals ?? 0)}${s.suffix ?? ''}`;
