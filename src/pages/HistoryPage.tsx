import { useMemo, useState } from 'react';
import type { MovementEntry, Tag } from '../types';
import { EntryCard } from '../components/EntryCard';
import { SectionCard } from '../components/SectionCard';

type HistoryPageProps = {
  entries: MovementEntry[];
  tags: Tag[];
  onEdit: (entry: MovementEntry) => void;
  onDuplicate: (entry: MovementEntry) => void;
  onDelete: (entry: MovementEntry) => void;
};

export function HistoryPage({ entries, tags, onEdit, onDuplicate, onDelete }: HistoryPageProps) {
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [bristol, setBristol] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesQuery =
        !query ||
        entry.notes.toLowerCase().includes(query.toLowerCase()) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

      const matchesRating = rating === 'all' || String(entry.satisfactionRating) === rating;
      const matchesBristol = bristol === 'all' || String(entry.bristolType) === bristol;

      return matchesQuery && matchesRating && matchesBristol;
    });
  }, [bristol, entries, query, rating]);

  return (
    <div className="stack stack--lg">
      <SectionCard eyebrow="Entry history" title="Search and filter records" description="Search notes or tags and narrow by rating or Bristol type.">
        <div className="filter-bar">
          <input className="input" placeholder="Search notes or tags" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="input" value={rating} onChange={(event) => setRating(event.target.value as typeof rating)}>
            <option value="all">All ratings</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
          <select className="input" value={bristol} onChange={(event) => setBristol(event.target.value as typeof bristol)}>
            <option value="all">All Bristol types</option>
            {[1, 2, 3, 4, 5, 6, 7].map((type) => (
              <option key={type} value={String(type)}>
                Type {type}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard title={`Entries (${filtered.length})`} description="Each card shows date, time, rating, Bristol type, tags, and notes preview.">
        <div className="entry-list">
          {filtered.length ? filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} tags={tags} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
          )) : <p className="empty-state">No entries match the current filters.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
