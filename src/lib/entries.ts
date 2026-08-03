import type { EntryDraft, MovementEntry } from '../types';
import { seededEntries } from '../data/mockData';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'bowel-tracker.entries.v2';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateEntryId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 version 4 UUID bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function normalizeEntryIds(entries: MovementEntry[]) {
  let changed = false;

  const normalized = entries.map((entry) => {
    if (UUID_REGEX.test(entry.id)) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      id: generateEntryId(),
      updatedAt: entry.updatedAt ?? new Date().toISOString(),
    };
  });

  return { normalized, changed };
}

export function loadEntries() {
  const loaded = readStorage<MovementEntry[]>(STORAGE_KEY, seededEntries);
  const { normalized, changed } = normalizeEntryIds(loaded);

  if (changed) {
    writeStorage(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function persistEntries(entries: MovementEntry[]) {
  writeStorage(STORAGE_KEY, entries);
}

export function createEntry(draft: EntryDraft) {
  const now = new Date().toISOString();
  return {
    id: generateEntryId(),
    createdAt: now,
    updatedAt: now,
    movementTime: draft.movementTime ?? now,
    satisfactionRating: draft.satisfactionRating,
    bristolType: draft.bristolType,
    notes: draft.notes,
    tags: draft.tags,
  } satisfies MovementEntry;
}

export function remapEntryIds(entries: MovementEntry[]) {
  const now = new Date().toISOString();
  return entries.map((entry) => ({
    ...entry,
    id: generateEntryId(),
    updatedAt: now,
  }));
}

export function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function toCsv(entries: MovementEntry[]) {
  const header = ['id', 'created_at', 'movement_time', 'satisfaction_rating', 'bristol_type', 'notes', 'tags'];
  const rows = entries.map((entry) => [
    entry.id,
    entry.createdAt,
    entry.movementTime,
    String(entry.satisfactionRating),
    String(entry.bristolType),
    entry.notes,
    entry.tags.join('|'),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(','))
    .join('\n');
}

export function parseCsv(csv: string) {
  const rows = csv.trim().split(/\r?\n/);
  if (rows.length < 2) {
    throw new Error('CSV must contain a header and at least one row.');
  }

  const [, ...dataRows] = rows;
  const entries: MovementEntry[] = dataRows.map((row) => {
    const columns = row.match(/"(?:[^"]|"")*"/g)?.map((value) => value.slice(1, -1).replaceAll('""', '"'));
    if (!columns || columns.length < 7) {
      throw new Error('Invalid CSV row.');
    }

    return {
      id: columns[0],
      createdAt: columns[1],
      updatedAt: columns[1],
      movementTime: columns[2],
      satisfactionRating: Number(columns[3]) as MovementEntry['satisfactionRating'],
      bristolType: Number(columns[4]) as MovementEntry['bristolType'],
      notes: columns[5],
      tags: columns[6] ? columns[6].split('|').filter(Boolean) : [],
    };
  });

  return entries;
}