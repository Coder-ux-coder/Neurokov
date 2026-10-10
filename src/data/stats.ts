/**
 * Hero numbers, all from the confirmed case studies (cases.ts): the calls are case 01's (17, the owner's
 * number since 2026-10-10; it was 46), the reply
 * time and close rate case 02's, the growth the psychology platform Mohid co-founded (case 03). Set
 * `statsArePlaceholders` to true if any of these become unconfirmed: that marks them data-ph and
 * blocks the build.
 *
 * `note` sits under a number on the board and says what it covers, the way clairvo.io scopes its
 * numbers ("On the numbers you dial."). Only facts from the case studies: never a made-up "before"
 * figure or a client's name (the user, 2026-10-10).
 *
 * `before` is what it was, only where a case study states it (the reply time's 19 hours, case 02): the
 * board shows it as a simple before -> after (the owner, 2026-10-10: "19 hours to 60 seconds").
 */
export const statsArePlaceholders = false;

export interface Stat {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  before?: string;
  label: string;
  note?: string;
}

export const heroStats: Stat[] = [
  { value: 17, label: 'qualified calls in 30 days', note: 'Cold outbound, no sales hires' },
  { value: 60, prefix: '<', suffix: 's', before: '19h', label: 'first reply to a new lead', note: 'Day or night, every lead' },
  { value: 20, suffix: '%+', label: 'higher close rate', note: 'Within a single quarter' },
  { value: 100, suffix: '%+', label: 'growth in one month', note: 'On a platform Mohid co-founded' },
];

export const formatStat = (s: Stat) => `${s.prefix ?? ''}${s.value.toFixed(s.decimals ?? 0)}${s.suffix ?? ''}`;
