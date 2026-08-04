import type { MovementEntry } from '../types';
import { toTimestamp } from './date';
import { isSupabaseConfigured, supabase } from './supabase';

type CloudTagRecord = {
  normalized_name?: string;
};

type CloudRelationRecord = {
  tags?: CloudTagRecord | null;
};

type CloudMovementRecord = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  movement_time?: string;
  satisfaction_rating?: number | null;
  bristol_type?: number | null;
  notes?: string;
  bowel_movement_tags?: CloudRelationRecord[];
};

type CloudMovementRecordWithRequiredFields = CloudMovementRecord & {
  id: string;
  created_at: string;
  movement_time: string;
};

export function canUseCloudSync() {
  return isSupabaseConfigured && Boolean(supabase);
}

const LEGACY_META_PREFIX = '[defa_meta:';

function stripLegacyMetaFromNotes(notes: string) {
  return notes.replace(/\s*\[defa_meta:[^\]]+\]\s*$/u, '').trimEnd();
}

function readLegacyMetaFromNotes(rawNotes: string | undefined) {
  const notes = typeof rawNotes === 'string' ? rawNotes : '';
  const match = notes.match(/\[defa_meta:([^\]]+)\]\s*$/u);
  if (!match) {
    return {
      notes,
      hasSatisfactionRating: true,
      hasBristolType: true,
      isNoMovement: false,
    };
  }

  const tokens = match[1]
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const hasNoMovement = tokens.includes('no_movement');
  const hasNoBristol = tokens.includes('no_bristol');

  return {
    notes: stripLegacyMetaFromNotes(notes),
    hasSatisfactionRating: !hasNoMovement,
    hasBristolType: !hasNoBristol,
    isNoMovement: hasNoMovement,
  };
}

function writeLegacyMetaToNotes(entry: MovementEntry) {
  const tokens: string[] = [];
  if (entry.hasSatisfactionRating === false || entry.isNoMovement === true) {
    tokens.push('no_movement');
  }
  if (entry.hasBristolType === false) {
    tokens.push('no_bristol');
  }

  const cleanNotes = stripLegacyMetaFromNotes(entry.notes ?? '');
  if (!tokens.length) {
    return cleanNotes;
  }

  return `${cleanNotes} ${LEGACY_META_PREFIX}${tokens.join(',')}]`.trim();
}

function resolveUpdatedTime(entry: MovementEntry) {
  return entry.updatedAt ?? entry.createdAt;
}

type ParsedMetric<T extends MovementEntry['satisfactionRating'] | MovementEntry['bristolType']> = {
  value: T;
  hasValue: boolean;
};

function parseBristolType(value: number | null | undefined): ParsedMetric<MovementEntry['bristolType']> {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7) {
    return {
      value,
      hasValue: true,
    };
  }

  return {
    value: 4 as MovementEntry['bristolType'],
    hasValue: false,
  };
}

function parseSatisfactionRating(value: number | null | undefined): ParsedMetric<MovementEntry['satisfactionRating']> {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return {
      value,
      hasValue: true,
    };
  }

  return {
    value: 3 as MovementEntry['satisfactionRating'],
    hasValue: false,
  };
}

function hasRequiredMovementFields(row: CloudMovementRecord): row is CloudMovementRecordWithRequiredFields {
  return typeof row.id === 'string' && typeof row.created_at === 'string' && typeof row.movement_time === 'string';
}

function mergeEntries(localEntries: MovementEntry[], remoteEntries: MovementEntry[]) {
  const combined = new Map<string, MovementEntry>();

  [...localEntries, ...remoteEntries].forEach((entry) => {
    const previous = combined.get(entry.id);
    if (!previous) {
      combined.set(entry.id, entry);
      return;
    }

    const left = new Date(resolveUpdatedTime(previous)).getTime();
    const right = new Date(resolveUpdatedTime(entry)).getTime();
    combined.set(entry.id, right >= left ? entry : previous);
  });

  return [...combined.values()].sort((left, right) => toTimestamp(right.movementTime) - toTimestamp(left.movementTime));
}

export async function hydrateEntriesFromCloud(localEntries: MovementEntry[], userId: string | null) {
  if (!canUseCloudSync()) {
    return localEntries;
  }

  if (!userId || !supabase) {
    return localEntries;
  }

  const { data, error } = await supabase
    .from('bowel_movements')
    .select('id, created_at, updated_at, movement_time, satisfaction_rating, bristol_type, notes, bowel_movement_tags(tag_id, tags(normalized_name))')
    .eq('user_id', userId)
    .order('movement_time', { ascending: false });

  if (error) {
    throw error;
  }

  const remoteEntries = (Array.isArray(data) ? data : [])
    .map((row) => row as CloudMovementRecord)
    .filter(hasRequiredMovementFields)
    .map((row) => {
      const satisfaction = parseSatisfactionRating(row.satisfaction_rating);
      const bristol = parseBristolType(row.bristol_type);
      const legacyMeta = readLegacyMetaFromNotes(typeof row.notes === 'string' ? row.notes : '');
      return {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : row.created_at,
        movementTime: row.movement_time,
        satisfactionRating: satisfaction.value,
        bristolType: bristol.value,
        hasSatisfactionRating: legacyMeta.hasSatisfactionRating && satisfaction.hasValue,
        hasBristolType: legacyMeta.hasBristolType && bristol.hasValue,
        isNoMovement: legacyMeta.isNoMovement || !satisfaction.hasValue,
        notes: legacyMeta.notes,
        tags: (Array.isArray(row.bowel_movement_tags) ? row.bowel_movement_tags : [])
          .map((item) => item.tags?.normalized_name)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      };
    });

  return mergeEntries(localEntries, remoteEntries);
}

export async function pushEntriesToCloud(entries: MovementEntry[], userId: string | null) {
  if (!canUseCloudSync()) {
    return;
  }

  if (!userId || !supabase) {
    return;
  }

  const rows = entries.map((entry) => ({
    id: entry.id,
    user_id: userId,
    created_at: entry.createdAt,
    updated_at: resolveUpdatedTime(entry),
    movement_time: entry.movementTime,
    satisfaction_rating: entry.satisfactionRating,
    bristol_type: entry.bristolType,
    notes: writeLegacyMetaToNotes(entry),
  }));

  const { error: upsertError } = await supabase
    .from('bowel_movements')
    .upsert(rows, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from('bowel_movements')
    .select('id')
    .eq('user_id', userId);

  if (existingRowsError) {
    throw existingRowsError;
  }

  const localIds = new Set(entries.map((entry) => entry.id));
  const remoteOnlyIds = (existingRows ?? [])
    .map((row) => row.id)
    .filter((id) => !localIds.has(id));

  if (remoteOnlyIds.length) {
    const { error: deleteError } = await supabase
      .from('bowel_movements')
      .delete()
      .in('id', remoteOnlyIds);

    if (deleteError) {
      throw deleteError;
    }
  }

  const tagNames = [...new Set(entries.flatMap((entry) => entry.tags).filter(Boolean))];

  if (tagNames.length) {
    const tagRows = tagNames.map((normalizedName) => ({
      user_id: userId,
      name: normalizedName,
      normalized_name: normalizedName,
    }));

    const { error: tagInsertError } = await supabase
      .from('tags')
      .upsert(tagRows, { onConflict: 'user_id,normalized_name' });

    if (tagInsertError) {
      throw tagInsertError;
    }
  }

  const { data: tagsData, error: tagsError } = await supabase
    .from('tags')
    .select('id, normalized_name')
    .eq('user_id', userId);

  if (tagsError) {
    throw tagsError;
  }

  const tagIdByName = new Map((tagsData ?? []).map((tag) => [tag.normalized_name, tag.id]));
  const movementIds = entries.map((entry) => entry.id);

  if (movementIds.length) {
    const { error: deleteRelationsError } = await supabase
      .from('bowel_movement_tags')
      .delete()
      .in('bowel_movement_id', movementIds);

    if (deleteRelationsError) {
      throw deleteRelationsError;
    }
  }

  const relationRows = entries.flatMap((entry) =>
    entry.tags
      .map((tagName) => {
        const tagId = tagIdByName.get(tagName);
        if (!tagId) {
          return null;
        }

        return {
          bowel_movement_id: entry.id,
          tag_id: tagId,
        };
      })
      .filter((value): value is { bowel_movement_id: string; tag_id: string } => Boolean(value)),
  );

  if (relationRows.length) {
    const { error: relationInsertError } = await supabase
      .from('bowel_movement_tags')
      .insert(relationRows);

    if (relationInsertError) {
      throw relationInsertError;
    }
  }
}

export async function clearAllEntriesFromCloud(userId: string | null) {
  if (!canUseCloudSync()) {
    return;
  }

  if (!userId || !supabase) {
    return;
  }

  const { error: deleteMovementError } = await supabase
    .from('bowel_movements')
    .delete()
    .eq('user_id', userId);

  if (deleteMovementError) {
    throw deleteMovementError;
  }

  const { error: deleteTagError } = await supabase
    .from('tags')
    .delete()
    .eq('user_id', userId);

  if (deleteTagError) {
    throw deleteTagError;
  }
}
