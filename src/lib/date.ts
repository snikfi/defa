import {
  differenceInCalendarDays,
  differenceInHours,
  format,
  formatDistanceToNow,
  isValid,
  isSameDay,
  parse,
  parseISO,
  subDays,
} from 'date-fns';

export function toDate(value: string | Date) {
  if (value instanceof Date) {
    return value;
  }

  const iso = parseISO(value);
  if (isValid(iso)) {
    return iso;
  }

  const knownFormats = [
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd',
    'M/d/yyyy h:mm a',
    'M/d/yyyy H:mm:ss',
    'M/d/yyyy H:mm',
    'M/d/yyyy',
    'd/M/yyyy H:mm:ss',
    'd/M/yyyy H:mm',
    'd/M/yyyy',
    'MMM d, yyyy h:mm a',
    'MMM d, yyyy',
  ] as const;

  for (const formatPattern of knownFormats) {
    const parsed = parse(value, formatPattern, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  return new Date(value);
}

export function toTimestamp(value: string | Date) {
  const timestamp = toDate(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function formatShortDate(value: string | Date) {
  return format(toDate(value), 'EEE, MMM d');
}

export function formatTime(value: string | Date) {
  return format(toDate(value), 'h:mm a');
}

export function timeAgo(value: string | Date) {
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}

export function sameDay(left: string | Date, right: string | Date) {
  return isSameDay(toDate(left), toDate(right));
}

export function withinDays(value: string | Date, days: number) {
  return differenceInCalendarDays(new Date(), toDate(value)) <= days;
}

export function hourBucket(value: string | Date) {
  return format(toDate(value), 'HH');
}

export function gapInHours(left: string | Date, right: string | Date) {
  return differenceInHours(toDate(left), toDate(right));
}

export function daysAgo(days: number) {
  return subDays(new Date(), days);
}
