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

export const seededEntries: MovementEntry[] = [];
