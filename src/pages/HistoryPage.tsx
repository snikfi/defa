import { useEffect, useMemo, useState } from 'react';
import type { MovementEntry, Tag } from '../types';
import { SectionCard } from '../components/SectionCard';
import { formatShortDate, formatTime } from '../lib/date';
import { bristolDescriptions, satisfactionLabels } from '../lib/health';

type HistoryPageProps = {
  entries: MovementEntry[];
  tags: Tag[];
  onEdit: (entry: MovementEntry) => void;
  onDuplicate: (entry: MovementEntry) => void;
  onDelete: (entry: MovementEntry) => void;
};

export function HistoryPage({ entries, tags, onEdit, onDuplicate, onDelete }: HistoryPageProps) {
  const PAGE_SIZE = 10;
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [bristol, setBristol] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return entries
      .filter((entry) => {
      const matchesQuery =
        !query ||
        entry.notes.toLowerCase().includes(query.toLowerCase()) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

      const matchesRating = rating === 'all' || String(entry.satisfactionRating) === rating;
      const matchesBristol = bristol === 'all' || String(entry.bristolType) === bristol;

      return matchesQuery && matchesRating && matchesBristol;
      })
      .sort((left, right) => +new Date(right.movementTime) - +new Date(left.movementTime));
  }, [bristol, entries, query, rating]);

  const tagNameById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pagedEntries = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, rating, bristol]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

      <SectionCard title={`Entries (${filtered.length})`} description="Structured table view for faster scanning and edits.">
        {filtered.length ? (
          <div className="history-table-shell">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Satisfaction</th>
                  <th>Bristol</th>
                  <th>Tags</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedEntries.map((entry) => {
                  const tagNames = entry.tags.map((tagId) => tagNameById.get(tagId) ?? tagId).filter(Boolean);

                  return (
                    <tr key={entry.id}>
                      <td>{formatShortDate(entry.movementTime)}</td>
                      <td>{formatTime(entry.movementTime)}</td>
                      <td>
                        <span className="pill pill--green">{satisfactionLabels[entry.satisfactionRating]}</span>
                      </td>
                      <td>
                        <strong>Type {entry.bristolType}</strong>
                        <div className="history-table__subtle">{bristolDescriptions[entry.bristolType]}</div>
                      </td>
                      <td>
                        {tagNames.length ? (
                          <div className="chip-row">
                            {tagNames.map((tagName) => (
                              <span key={`${entry.id}-${tagName}`} className="chip">{tagName}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="history-table__subtle">-</span>
                        )}
                      </td>
                      <td>
                        <div className="history-table__notes">{entry.notes || '-'}</div>
                      </td>
                      <td>
                        <div className="history-table__actions">
                          <button type="button" className="ghost-button" onClick={() => onEdit(entry)}>
                            Edit
                          </button>
                          <button type="button" className="ghost-button" onClick={() => onDuplicate(entry)}>
                            Duplicate
                          </button>
                          <button type="button" className="ghost-button ghost-button--danger" onClick={() => onDelete(entry)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="history-pagination">
              <p className="helper-text">
                Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="history-pagination__controls">
                <button type="button" className="ghost-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1}>
                  Previous
                </button>
                <span className="pill">Page {safePage} / {totalPages}</span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-state">No entries match the current filters.</p>
        )}
      </SectionCard>
    </div>
  );
}
