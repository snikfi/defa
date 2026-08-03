import type { MovementEntry, Tag } from '../types';
import { bristolDescriptions, satisfactionLabels } from '../lib/health';
import { formatShortDate, formatTime } from '../lib/date';

type EntryCardProps = {
  entry: MovementEntry;
  tags: Tag[];
  onEdit: (entry: MovementEntry) => void;
  onDuplicate: (entry: MovementEntry) => void;
  onDelete: (entry: MovementEntry) => void;
};

export function EntryCard({ entry, tags, onEdit, onDuplicate, onDelete }: EntryCardProps) {
  const tagNames = entry.tags
    .map((tagId) => tags.find((tag) => tag.id === tagId)?.name ?? tagId)
    .filter(Boolean);

  return (
    <article className="entry-card">
      <div className="entry-card__top">
        <div>
          <p className="entry-card__date">{formatShortDate(entry.movementTime)}</p>
          <p className="entry-card__time">{formatTime(entry.movementTime)}</p>
        </div>
        <span className="pill pill--green">{satisfactionLabels[entry.satisfactionRating as keyof typeof satisfactionLabels]}</span>
      </div>

      <div className="entry-card__metrics">
        <div>
          <span className="entry-card__metric-label">Bristol</span>
          <strong>Type {entry.bristolType}</strong>
          <p>{bristolDescriptions[entry.bristolType]}</p>
        </div>
        <div>
          <span className="entry-card__metric-label">Satisfaction</span>
          <strong>{entry.satisfactionRating}/5</strong>
          <p>{satisfactionLabels[entry.satisfactionRating as keyof typeof satisfactionLabels]}</p>
        </div>
      </div>

      {tagNames.length ? (
        <div className="chip-row" aria-label="entry tags">
          {tagNames.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {entry.notes ? <p className="entry-card__notes">{entry.notes}</p> : null}

      <div className="entry-card__actions">
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
    </article>
  );
}
