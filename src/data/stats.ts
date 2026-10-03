/**
 * Hero numbers, confirmed by the user. The growth figure is the psychology
 * platform Mohid co-founded (see cases.ts). Set `statsArePlaceholders` back to
 * true if any of these become unconfirmed: that marks them data-ph and blocks the build.
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
  { value: 100, suffix: '%+', label: 'growth in one month' },
  { value: 150, suffix: '+', label: 'automations shipped' },
  { value: 50, suffix: 'K+', label: 'hours handed back' },
  { value: 6, suffix: ' yrs', label: 'building automations' },
];

export const formatStat = (s: Stat) => `${s.prefix ?? ''}${s.value.toFixed(s.decimals ?? 0)}${s.suffix ?? ''}`;
