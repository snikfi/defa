export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SatisfactionRating = 1 | 2 | 3 | 4 | 5;

export type RangeKey = 'today' | '7d' | '30d' | '90d' | 'year' | 'lifetime';

export type Tag = {
  id: string;
  name: string;
};

export type MovementEntry = {
  id: string;
  createdAt: string;
  movementTime: string;
  satisfactionRating: SatisfactionRating;
  bristolType: BristolType;
  notes: string;
  tags: string[];
  hasSatisfactionRating?: boolean;
  hasBristolType?: boolean;
  isNoMovement?: boolean;
  updatedAt?: string;
};

export type EntryDraft = Omit<MovementEntry, 'id' | 'createdAt' | 'movementTime'> & {
  movementTime?: string;
};

export type AppSettings = {
  pinEnabled: boolean;
  pinLength: number;
  autoLockMinutes: number;
  theme: 'dark' | 'light';
  reminderEnabled: boolean;
  reminderHour: number;
};
