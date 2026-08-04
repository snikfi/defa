import { format, startOfDay, startOfWeek, subDays } from 'date-fns';
import type { MovementEntry, RangeKey } from '../types';
import { gapInHours, sameDay, toDate, toTimestamp } from './date';

export const bristolDescriptions = {
  1: 'Separate hard lumps',
  2: 'Lumpy and sausage-like',
  3: 'Sausage with cracks',
  4: 'Smooth and soft',
  5: 'Soft blobs with clear edges',
  6: 'Mushy consistency',
  7: 'Watery, no solid pieces',
} as const;

export const satisfactionLabels = {
  1: 'Very difficult / unsuccessful',
  2: 'Difficult exit',
  3: 'Okay',
  4: 'Good',
  5: 'Satisfying',
} as const;

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, current) => sum + current, 0) / values.length;
}

function getMovementEntries(entries: MovementEntry[]) {
  return entries.filter((entry) => entry.isNoMovement !== true && entry.hasSatisfactionRating !== false);
}

function getBristolRecordedEntries(entries: MovementEntry[]) {
  return entries.filter((entry) => entry.hasBristolType !== false);
}

function filterByRange(entries: MovementEntry[], range: RangeKey) {
  const now = new Date();

  if (range === 'lifetime') {
    return entries;
  }

  const threshold =
    range === 'today'
      ? startOfDay(now)
      : range === '7d'
        ? subDays(now, 6)
        : range === '30d'
          ? subDays(now, 29)
          : range === '90d'
            ? subDays(now, 89)
            : range === 'year'
              ? subDays(now, 364)
              : startOfDay(now);

  return entries.filter((entry) => toDate(entry.movementTime) >= threshold);
}

function trendLabel(values: number[]) {
  if (values.length < 4) {
    return 'Stable';
  }

  const midpoint = Math.floor(values.length / 2);
  const first = average(values.slice(0, midpoint));
  const second = average(values.slice(midpoint));

  if (second - first > 0.4) return 'Improving';
  if (first - second > 0.4) return 'Declining';
  return 'Stable';
}

export function getDashboardSummary(entries: MovementEntry[]) {
  const movementEntries = getMovementEntries(entries);
  const todayEntries = movementEntries.filter((entry) => sameDay(entry.movementTime, new Date()));
  const weekEntries = filterByRange(movementEntries, '7d');
  const monthEntries = filterByRange(movementEntries, '30d');
  const weekBristolEntries = getBristolRecordedEntries(weekEntries);

  const ordered = [...movementEntries].sort((left, right) => toTimestamp(right.movementTime) - toTimestamp(left.movementTime));
  const futureToleranceMs = 5 * 60 * 1000;
  const latest = ordered.find((entry) => toTimestamp(entry.movementTime) <= Date.now() + futureToleranceMs) ?? ordered[0];
  const lifetimeAverage = average(movementEntries.map((entry) => entry.satisfactionRating));
  const averagePerDay = movementEntries.length / Math.max(1, new Set(movementEntries.map((entry) => startOfDay(toDate(entry.movementTime)).toISOString())).size);

  const commonBristol = Object.entries(
    getBristolRecordedEntries(movementEntries).reduce<Record<string, number>>((accumulator, entry) => {
      const key = String(entry.bristolType);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? '4';

  return {
    today: {
      count: todayEntries.length,
      average: average(todayEntries.map((entry) => entry.satisfactionRating)),
      latest,
      gapHours: latest ? gapInHours(new Date(), latest.movementTime) : null,
    },
    week: {
      count: weekEntries.length,
      average: average(weekEntries.map((entry) => entry.satisfactionRating)),
      averageBristol: average(weekBristolEntries.map((entry) => entry.bristolType)),
    },
    month: {
      count: monthEntries.length,
      average: average(monthEntries.map((entry) => entry.satisfactionRating)),
      trend: trendLabel(movementEntries.slice().sort((left, right) => +toDate(left.movementTime) - +toDate(right.movementTime)).map((entry) => entry.satisfactionRating)),
    },
    overall: {
      lifetimeEntries: movementEntries.length,
      lifetimeAverage,
      averagePerDay,
      commonBristol: Number(commonBristol) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    },
  };
}

export function getTimelineForDay(entries: MovementEntry[], day: Date) {
  return entries
    .filter((entry) => sameDay(entry.movementTime, day))
    .sort((left, right) => +toDate(left.movementTime) - +toDate(right.movementTime));
}

export function getChartSeries(entries: MovementEntry[], range: RangeKey) {
  const filtered = filterByRange(getMovementEntries(entries), range).sort((left, right) => +toDate(left.movementTime) - +toDate(right.movementTime));

  const frequency = filtered.reduce<Record<string, number>>((accumulator, entry) => {
    const key = formatRangeLabel(entry, range);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const satisfaction = filtered.map((entry) => ({
    date: formatRangeLabel(entry, range),
    value: entry.satisfactionRating,
  }));

  const bristol = filtered.reduce<Record<string, number>>((accumulator, entry) => {
    const key = `Type ${entry.bristolType}`;
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const dayCounts = filtered.reduce<Record<string, number>>((accumulator, entry) => {
    const key = format(toDate(entry.movementTime), 'yyyy-MM-dd');
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const coverageDates = getCoverageDates(range, filtered);

  return {
    frequency: Object.entries(frequency).map(([label, value]) => ({ label, value })),
    satisfaction,
    bristol: Object.entries(bristol).map(([name, value]) => ({ name, value })),
    heatmap: coverageDates.map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      return {
        day: key,
        label: format(date, 'EEE, MMM d'),
        value: dayCounts[key] ?? 0,
      };
    }),
  };
}

export function getLongestGap(entries: MovementEntry[]) {
  const movementEntries = getMovementEntries(entries);

  if (movementEntries.length < 2) {
    return 0;
  }

  const ordered = movementEntries.slice().sort((left, right) => +toDate(left.movementTime) - +toDate(right.movementTime));
  return ordered.reduce((longest, entry, index) => {
    if (index === 0) {
      return longest;
    }

    const gap = gapInHours(entry.movementTime, ordered[index - 1].movementTime) / 24;
    return Math.max(longest, gap);
  }, 0);
}

export function getBestAndWorstWeeks(entries: MovementEntry[]) {
  const weeks = new Map<string, number[]>();

  getMovementEntries(entries).forEach((entry) => {
    const weekKey = startOfWeek(toDate(entry.movementTime), { weekStartsOn: 1 }).toISOString();
    const current = weeks.get(weekKey) ?? [];
    current.push(entry.satisfactionRating);
    weeks.set(weekKey, current);
  });

  const scored = [...weeks.entries()].map(([weekKey, values]) => ({ weekKey, average: average(values) }));

  const best = scored.reduce<{ weekKey: string; average: number } | null>((winner, current) => {
    if (!winner || current.average > winner.average) {
      return current;
    }

    return winner;
  }, null);

  const worst = scored.reduce<{ weekKey: string; average: number } | null>((loser, current) => {
    if (!loser || current.average < loser.average) {
      return current;
    }

    return loser;
  }, null);

  return { best, worst };
}

function formatRangeLabel(entry: MovementEntry, range: RangeKey) {
  const date = toDate(entry.movementTime);

  if (range === 'today' || range === '7d') {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }

  if (range === '30d' || range === '90d') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  if (range === 'year') {
    return date.toLocaleDateString(undefined, { month: 'short' });
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getCoverageDates(range: RangeKey, filtered: MovementEntry[]) {
  const today = startOfDay(new Date());
  const start =
    range === 'today'
      ? today
      : range === '7d'
        ? subDays(today, 6)
        : range === '30d'
          ? subDays(today, 29)
          : range === '90d'
            ? subDays(today, 89)
            : range === 'year'
              ? subDays(today, 364)
              : filtered.length
                ? subDays(today, Math.min(179, Math.max(0, differenceInDays(today, startOfDay(toDate(filtered[0].movementTime))))))
                : subDays(today, 29);

  const days: Date[] = [];
  let cursor = start;
  while (cursor <= today) {
    days.push(cursor);
    cursor = subDays(cursor, -1);
  }

  return days;
}

function differenceInDays(left: Date, right: Date) {
  return Math.floor((left.getTime() - right.getTime()) / 86_400_000);
}
