import { motion } from 'framer-motion';
import type { MovementEntry, Tag } from '../types';
import { EntryCard } from '../components/EntryCard';
import { QuickLogForm, type QuickLogValues } from '../components/QuickLogForm';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { bristolDescriptions, getDashboardSummary, getTimelineForDay } from '../lib/health';
import { formatTime, sameDay, timeAgo } from '../lib/date';

type DashboardPageProps = {
  entries: MovementEntry[];
  tags: Tag[];
  draftValues: QuickLogValues;
  editingEntry: MovementEntry | null;
  onSubmit: (values: QuickLogValues) => void;
  onCancelEdit: () => void;
  onEdit: (entry: MovementEntry) => void;
  onDuplicate: (entry: MovementEntry) => void;
  onDelete: (entry: MovementEntry) => void;
};

export function DashboardPage({
  entries,
  tags,
  draftValues,
  editingEntry,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDuplicate,
  onDelete,
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
          <QuickLogForm tags={tags} initialValues={draftValues} editingEntry={editingEntry} onSubmit={onSubmit} onCancel={onCancelEdit} />
        </SectionCard>

        <SectionCard eyebrow="Today" title="Daily timeline">
          {timeline.length ? (
            <div className="timeline-list">
              {timeline.map((entry) => (
                <div key={entry.id} className="timeline-item">
                  <strong>{formatTime(entry.movementTime)}</strong>
                  <span>✓</span>
                  <small>{bristolDescriptions[entry.bristolType]}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No entries for this day yet.</p>
          )}
          <div className="subtle-note">
            <p>Last movement: {summary.today.latest ? formatTime(summary.today.latest.movementTime) : 'None'}</p>
            <p>Time since last: {summary.today.latest ? timeAgo(summary.today.latest.movementTime) : 'No entry yet'}</p>
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

      <SectionCard eyebrow="Recent history" title="Latest entries" description="Cards support edit, duplicate, and delete actions.">
        <div className="entry-list">
          {entries.length ? entries.slice(0, 4).map((entry) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <EntryCard entry={entry} tags={tags} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
            </motion.div>
          )) : <p className="empty-state">No entries yet. Start with the quick log form.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
