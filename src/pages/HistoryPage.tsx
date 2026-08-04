import { useEffect, useMemo, useState } from 'react';
import type { MovementEntry, Tag } from '../types';
import { SectionCard } from '../components/SectionCard';
import { formatShortDate, formatTime, toTimestamp } from '../lib/date';
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
  const [rating, setRating] = useState<'all' | 'no-movement' | '1' | '2' | '3' | '4' | '5'>('all');
  const [bristol, setBristol] = useState<'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7'>('all');
  const [page, setPage] = useState(1);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return entries
      .filter((entry) => {
      const matchesQuery =
        !query ||
        entry.notes.toLowerCase().includes(query.toLowerCase()) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

      const isNoMovementRow = entry.isNoMovement === true || entry.hasSatisfactionRating === false;
      const matchesRating =
        rating === 'all'
          ? true
          : rating === 'no-movement'
            ? isNoMovementRow
            : entry.hasSatisfactionRating !== false && String(entry.satisfactionRating) === rating;
      const matchesBristol = bristol === 'all' || (entry.hasBristolType !== false && String(entry.bristolType) === bristol);

      return matchesQuery && matchesRating && matchesBristol;
      })
        .sort((left, right) => toTimestamp(right.movementTime) - toTimestamp(left.movementTime));
  }, [bristol, entries, query, rating]);

  const tagNameById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags]);
  const satisfactionClassByRating = {
    1: 'pill--rating-1',
    2: 'pill--rating-2',
    3: 'pill--rating-3',
    4: 'pill--rating-4',
    5: 'pill--rating-5',
  } as const;

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

  useEffect(() => {
    if (!openActionsId) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest('.history-actions-dropdown')) {
        setOpenActionsId(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionsId(null);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openActionsId]);

  return (
    <div className="stack stack--lg">
      <SectionCard eyebrow="Entry history" title="Search and filter records" description="Search notes or tags and narrow by rating or Bristol type.">
        <div className="filter-bar">
          <input className="input" placeholder="Search notes or tags" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="input" value={rating} onChange={(event) => setRating(event.target.value as typeof rating)}>
            <option value="all">All ratings</option>
            <option value="no-movement">No movement</option>
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
                {pagedEntries.map((entry, index) => {
                  const tagNames = entry.tags.map((tagId) => tagNameById.get(tagId) ?? tagId).filter(Boolean);
                  const isNoMovementRow = entry.isNoMovement === true || entry.hasSatisfactionRating === false;
                  const dateLabel = formatShortDate(entry.movementTime);
                  const previousDateLabel = index > 0 ? formatShortDate(pagedEntries[index - 1].movementTime) : null;
                  const nextDateLabel = index < pagedEntries.length - 1 ? formatShortDate(pagedEntries[index + 1].movementTime) : null;
                  const startsGroup = previousDateLabel !== dateLabel;
                  const endsGroup = nextDateLabel !== dateLabel;

                  const groupClass = startsGroup && endsGroup
                    ? 'history-table__row-group-single'
                    : startsGroup
                      ? 'history-table__row-group-start'
                      : endsGroup
                        ? 'history-table__row-group-end'
                        : 'history-table__row-group-middle';

                  const rowClassName = [
                    groupClass,
                    isNoMovementRow ? 'history-table__row--no-movement' : '',
                  ].filter(Boolean).join(' ');

                  return (
                      <tr key={entry.id} className={rowClassName}>
                        <td>{startsGroup ? dateLabel : <span className="history-table__subtle"> </span>}</td>
                        <td>{entry.isNoMovement ? <span className="history-table__subtle">-</span> : formatTime(entry.movementTime)}</td>
                        <td>
                          {entry.hasSatisfactionRating === false ? (
                            <span className="history-status-badge" role="status" aria-label="No movement day">No movement day</span>
                          ) : (
                            <span className={`pill history-satisfaction-pill ${satisfactionClassByRating[entry.satisfactionRating]}`}>
                              <span className="history-satisfaction-pill__score">{entry.satisfactionRating}</span>
                              <span>{satisfactionLabels[entry.satisfactionRating]}</span>
                            </span>
                          )}
                        </td>
                        <td>
                          {entry.hasBristolType === false ? (
                            <span className="history-table__subtle">Not recorded</span>
                          ) : (
                            <>
                              <strong>Type {entry.bristolType}</strong>
                              <div className="history-table__subtle">{bristolDescriptions[entry.bristolType]}</div>
                            </>
                          )}
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
                          <div className="history-actions-dropdown">
                            <button
                              type="button"
                              className="ghost-button history-actions-dropdown__trigger"
                              aria-haspopup="menu"
                              aria-expanded={openActionsId === entry.id}
                              aria-label="Open entry actions"
                              onClick={() => setOpenActionsId((current) => (current === entry.id ? null : entry.id))}
                            >
                              <span aria-hidden="true">⋯</span>
                            </button>

                            {openActionsId === entry.id ? (
                              <div className="history-actions-dropdown__menu" role="menu" aria-label="Entry actions">
                                <button
                                  type="button"
                                  className="history-actions-dropdown__item"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    onEdit(entry);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="history-actions-dropdown__item"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    onDuplicate(entry);
                                  }}
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  className="history-actions-dropdown__item history-actions-dropdown__item--danger"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    onDelete(entry);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
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
