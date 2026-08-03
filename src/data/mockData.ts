import type { AppSettings, MovementEntry, Tag } from '../types';

export const defaultTags: Tag[] = [
  'Coffee',
  'Alcohol',
  'Spicy food',
  'Dairy',
  'High fibre',
  'Low fibre',
  'Stress',
  'Travel',
  'Gym',
  'Illness',
  'Medication',
  'Poor sleep',
].map((name) => ({ id: name.toLowerCase().replaceAll(' ', '-'), name }));

export const defaultSettings: AppSettings = {
  pinEnabled: true,
  pinLength: 4,
  autoLockMinutes: 5,
  theme: 'dark',
  reminderEnabled: false,
  reminderHour: 9,
};

const now = new Date();

function minutesAgo(value: number) {
  return new Date(now.getTime() - value * 60_000).toISOString();
}

function daysAgo(value: number, hour: number, minute: number) {
  const date = new Date(now);
  date.setDate(date.getDate() - value);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const seededEntries: MovementEntry[] = [
  {
    id: 'entry-1',
    createdAt: minutesAgo(25),
    movementTime: minutesAgo(25),
    satisfactionRating: 5,
    bristolType: 4,
    notes: 'Quick, easy, and no discomfort.',
    tags: ['coffee', 'high fibre'],
  },
  {
    id: 'entry-2',
    createdAt: daysAgo(1, 8, 10),
    movementTime: daysAgo(1, 8, 10),
    satisfactionRating: 4,
    bristolType: 3,
    notes: 'After breakfast, felt normal.',
    tags: ['high fibre'],
  },
  {
    id: 'entry-3',
    createdAt: daysAgo(2, 12, 12),
    movementTime: daysAgo(2, 12, 12),
    satisfactionRating: 3,
    bristolType: 5,
    notes: 'Slightly soft but manageable.',
    tags: ['stress'],
  },
  {
    id: 'entry-4',
    createdAt: daysAgo(4, 18, 5),
    movementTime: daysAgo(4, 18, 5),
    satisfactionRating: 2,
    bristolType: 6,
    notes: 'Travel day; routine felt off.',
    tags: ['travel', 'poor sleep'],
  },
  {
    id: 'entry-5',
    createdAt: daysAgo(6, 7, 45),
    movementTime: daysAgo(6, 7, 45),
    satisfactionRating: 4,
    bristolType: 4,
    notes: 'Good morning log after coffee.',
    tags: ['coffee'],
  },
];
