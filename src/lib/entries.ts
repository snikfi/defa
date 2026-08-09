import type { EntryDraft, MovementEntry } from '../types';
import { isValid, parse, parseISO } from 'date-fns';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'bowel-tracker.entries.v2';

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

export function loadEntries() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('bowel-tracker.entries.v1');
  }

  return readStorage<MovementEntry[]>(STORAGE_KEY, []);
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
    hasSatisfactionRating: true,
    hasBristolType: true,
    isNoMovement: false,
  } satisfies MovementEntry;
}

export function remapEntryIds(entries: MovementEntry[]) {
  return entries;
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
    entry.hasSatisfactionRating === false ? '' : String(entry.satisfactionRating),
    entry.hasBristolType === false ? '' : String(entry.bristolType),
    entry.notes,
    entry.tags.join('|'),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => csvEscape(value)).join(','))
    .join('\n');
}

export function parseCsv(csv: string) {
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error('CSV must contain a header and at least one row.');
  }

  const detectedDelimiter = detectDelimiter(rows[0]);
  const headerColumns = parseCsvLine(rows[0], detectedDelimiter).map((value) => normalizeHeader(value));

  const indexByName = new Map(headerColumns.map((name, index) => [name, index]));
  const requiredHeaders = ['id', 'created_at', 'movement_time', 'satisfaction_rating', 'bristol_type', 'notes', 'tags'] as const;
  const hasNamedHeader = requiredHeaders.every((name) => indexByName.has(name));

  const positionalIndexes = {
    id: 0,
    created_at: 1,
    movement_time: 2,
    satisfaction_rating: 3,
    bristol_type: 4,
    notes: 5,
    tags: 6,
  } as const;

  const getIndex = (name: keyof typeof positionalIndexes) => {
    if (hasNamedHeader) {
      return indexByName.get(name) ?? positionalIndexes[name];
    }

    return positionalIndexes[name];
  };

  const dataRows = rows.slice(1);
  const entries: MovementEntry[] = dataRows.map((row, rowIndex) => {
    const lineNumber = rowIndex + 2;
    const columns = parseCsvLine(row, detectedDelimiter);

    const requiredIndex = Math.max(
      getIndex('id'),
      getIndex('created_at'),
      getIndex('movement_time'),
      getIndex('satisfaction_rating'),
      getIndex('bristol_type'),
      getIndex('notes'),
      getIndex('tags'),
    );

    if (columns.length <= requiredIndex) {
      throw new Error(`Invalid CSV row at line ${lineNumber}.`);
    }

    const id = columns[getIndex('id')]?.trim();
    const createdAt = parseTimestampCell(columns[getIndex('created_at')], lineNumber, 'created_at');
    const movementTime = parseTimestampCell(columns[getIndex('movement_time')], lineNumber, 'movement_time');
    const satisfaction = parseSatisfactionRatingCell(columns[getIndex('satisfaction_rating')], lineNumber);
    const bristol = parseBristolTypeCell(columns[getIndex('bristol_type')], lineNumber);
    const notes = columns[getIndex('notes')] ?? '';
    const tagsColumn = columns[getIndex('tags')] ?? '';

    if (!id || !createdAt || !movementTime) {
      throw new Error(`Missing required values at line ${lineNumber}.`);
    }

    return {
      id,
      createdAt,
      updatedAt: createdAt,
      movementTime,
      satisfactionRating: satisfaction.value,
      bristolType: bristol.value,
      notes,
      tags: tagsColumn ? tagsColumn.split('|').map((tag) => tag.trim()).filter(Boolean) : [],
      hasSatisfactionRating: satisfaction.hasValue,
      hasBristolType: bristol.hasValue,
      isNoMovement: !satisfaction.hasValue,
    };
  });

  return entries;
}

function parseCsvLine(line: string, delimiter: ',' | ';') {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === delimiter && !inQuotes) {
      columns.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns.map((value) => value.trim());
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(' ', '_');
}

function detectDelimiter(header: string): ',' | ';' {
  const commaCount = (header.match(/,/g) ?? []).length;
  const semicolonCount = (header.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

type ParsedLegacyMetric<T extends number> = {
  value: T;
  hasValue: boolean;
};

function parseSatisfactionRatingCell(rawValue: string | undefined, lineNumber: number): ParsedLegacyMetric<MovementEntry['satisfactionRating']> {
  if (!rawValue || !rawValue.trim()) {
    return {
      value: 3,
      hasValue: false,
    };
  }

  const value = parseNumericCell(rawValue);
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return {
      value,
      hasValue: true,
    };
  }

  throw new Error(`Invalid satisfaction_rating at line ${lineNumber}. Expected 1-5.`);
}

function parseBristolTypeCell(rawValue: string | undefined, lineNumber: number): ParsedLegacyMetric<MovementEntry['bristolType']> {
  if (!rawValue || !rawValue.trim()) {
    return {
      value: 4,
      hasValue: false,
    };
  }

  const value = parseNumericCell(rawValue);
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7) {
    return {
      value,
      hasValue: true,
    };
  }

  throw new Error(`Invalid bristol_type at line ${lineNumber}. Expected 1-7.`);
}

function parseNumericCell(rawValue: string | undefined) {
  const value = (rawValue ?? '').trim();
  if (!value) {
    return Number.NaN;
  }

  const direct = Number(value);
  if (Number.isFinite(direct)) {
    return direct;
  }

  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function parseTimestampCell(rawValue: string | undefined, lineNumber: number, fieldName: 'created_at' | 'movement_time') {
  const value = (rawValue ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${fieldName} at line ${lineNumber}.`);
  }

  if (/^\d+$/.test(value)) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      const epochMs = value.length <= 10 ? asNumber * 1000 : asNumber;
      const dateFromEpoch = new Date(epochMs);
      if (!Number.isNaN(dateFromEpoch.getTime())) {
        return dateFromEpoch.toISOString();
      }
    }
  }

  const isoCandidate = parseISO(value);
  if (isValid(isoCandidate)) {
    return isoCandidate.toISOString();
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

  for (const format of knownFormats) {
    const parsed = parse(value, format, new Date());
    if (isValid(parsed)) {
      return parsed.toISOString();
    }
  }

  const parsedByNative = new Date(value);
  if (!Number.isNaN(parsedByNative.getTime())) {
    return parsedByNative.toISOString();
  }

  throw new Error(`Invalid ${fieldName} at line ${lineNumber}. Use an ISO timestamp or a recognized date format.`);
}