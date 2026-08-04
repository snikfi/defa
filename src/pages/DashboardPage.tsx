import type { MovementEntry, Tag } from '../types';
import { QuickLogForm, type QuickLogValues } from '../components/QuickLogForm';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { getDashboardSummary, getTimelineForDay, satisfactionLabels } from '../lib/health';
import { formatTime, sameDay, timeAgo } from '../lib/date';

const bristolIllustrationByType = {
  1: '/bristol/type-1.svg',
  2: '/bristol/type-2.svg',
  3: '/bristol/type-3.svg',
  4: '/bristol/type-4.svg',
  5: '/bristol/type-5.svg',
  6: '/bristol/type-6.svg',
  7: '/bristol/type-7.svg',
} as const;

type DashboardPageProps = {
  entries: MovementEntry[];
  tags: Tag[];
  draftValues: QuickLogValues;
  editingEntry: MovementEntry | null;
  onSubmit: (values: QuickLogValues) => void;
  onCancelEdit: () => void;
};

export function DashboardPage({
  entries,
  tags,
  draftValues,
  editingEntry,
  onSubmit,
  onCancelEdit,
}: DashboardPageProps) {
  const summary = getDashboardSummary(entries);
  const todayEntries = entries.filter((entry) => sameDay(entry.movementTime, new Date()));
  const visibleDay = todayEntries[0] ? new Date(todayEntries[0].movementTime) : new Date();
  const timeline = getTimelineForDay(entries, visibleDay);

  return (
    <div className="stack stack--xl">
      <div id="quick-log" className="dashboard-grid dashboard-grid--two-col">
        <SectionCard
          eyebrow="Do this first"
          title={editingEntry ? 'Edit bowel movement' : 'Record a movement'}
          action={editingEntry ? <span className="pill pill--blue">Editing</span> : undefined}
        >
          <QuickLogForm tags={tags} initialValues={draftValues} editingEntry={editingEntry} progressive onSubmit={onSubmit} onCancel={onCancelEdit} />
        </SectionCard>

        <SectionCard eyebrow="Today" title="Daily timeline">
          {timeline.length ? (
            <div className="timeline-list">
              {timeline.map((entry) => {
                const hasRating = !entry.isNoMovement && entry.hasSatisfactionRating !== false;
                const hasBristolType = !entry.isNoMovement && entry.hasBristolType !== false;
                const bristolIllustration = hasBristolType ? bristolIllustrationByType[entry.bristolType] : null;

                return (
                  <div key={entry.id} className="timeline-item">
                    <strong>{entry.isNoMovement ? 'No movement' : formatTime(entry.movementTime)}</strong>
                    <div className="timeline-item__status">
                      {hasRating ? (
                        <span className={`pill history-satisfaction-pill pill--rating-${entry.satisfactionRating}`}>
                          <span className="history-satisfaction-pill__score">{entry.satisfactionRating}</span>
                          <span>{satisfactionLabels[entry.satisfactionRating]}</span>
                        </span>
                      ) : (
                        <span className="timeline-item__rating timeline-item__rating--muted">N/A</span>
                      )}
                      {bristolIllustration ? (
                        <img
                          src={bristolIllustration}
                          alt={`Bristol type ${entry.bristolType} illustration`}
                          className="timeline-item__illustration"
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No entries for this day yet.</p>
          )}
          <div className="subtle-note">
            <p>
              {summary.today.latest
                ? `Last movement ${formatTime(summary.today.latest.movementTime)}, ${timeAgo(summary.today.latest.movementTime)}`
                : 'Last movement: No entry yet'}
            </p>
          </div>
        </SectionCard>
      </div>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Personal bowel movement tracker</p>
          <h1>Your summary at a glance</h1>
          <p className="hero-panel__lede">
            After logging, review trends instantly and keep every entry synced across devices.
          </p>
        </div>
        <div className="hero-panel__actions">
          <span className="pill pill--green">Focus: fast logging first</span>
          <p className="hero-panel__hint">Last entry {entries[0] ? timeAgo(entries[0].movementTime) : 'not yet recorded'}.</p>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard label="Today" value={String(summary.today.count)} detail={`${summary.today.average.toFixed(1)}/5 avg satisfaction`} tone="good" />
        <StatCard label="This Week" value={String(summary.week.count)} detail={`${summary.week.averageBristol.toFixed(1)} average Bristol score`} tone="accent" />
        <StatCard label="This Month" value={String(summary.month.count)} detail={`Trend: ${summary.month.trend}`} tone="warning" />
        <StatCard label="Overall" value={String(summary.overall.lifetimeEntries)} detail={`${summary.overall.lifetimeAverage.toFixed(1)}/5 lifetime average`} />
      </div>
    </div>
  );
}
