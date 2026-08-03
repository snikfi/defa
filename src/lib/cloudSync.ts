import type { MovementEntry } from '../types';
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
  satisfaction_rating?: number;
  bristol_type?: number;
  notes?: string;
  bowel_movement_tags?: CloudRelationRecord[];
};

export function canUseCloudSync() {
  return isSupabaseConfigured && Boolean(supabase);
}

function resolveUpdatedTime(entry: MovementEntry) {
  return entry.updatedAt ?? entry.createdAt;
}

function parseBristolType(value: number | undefined): MovementEntry['bristolType'] {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7) {
    return value;
  }

  return 4;
}

function parseSatisfactionRating(value: number | undefined): MovementEntry['satisfactionRating'] {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }

  return 3;
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

  return [...combined.values()].sort((left, right) => +new Date(right.movementTime) - +new Date(left.movementTime));
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
    .filter((row) => typeof row.id === 'string' && typeof row.created_at === 'string' && typeof row.movement_time === 'string')
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : row.created_at,
      movementTime: row.movement_time,
      satisfactionRating: parseSatisfactionRating(row.satisfaction_rating),
      bristolType: parseBristolType(row.bristol_type),
      notes: typeof row.notes === 'string' ? row.notes : '',
      tags: (Array.isArray(row.bowel_movement_tags) ? row.bowel_movement_tags : [])
        .map((item) => item.tags?.normalized_name)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    }));

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
    notes: entry.notes,
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
