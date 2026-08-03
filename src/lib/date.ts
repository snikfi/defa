import {
  differenceInCalendarDays,
  differenceInHours,
  format,
  formatDistanceToNow,
  isSameDay,
  parseISO,
  subDays,
} from 'date-fns';

export function toDate(value: string | Date) {
  return typeof value === 'string' ? parseISO(value) : value;
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
