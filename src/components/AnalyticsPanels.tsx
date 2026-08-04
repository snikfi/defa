import { useEffect, useState, type CSSProperties } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RangeKey } from '../types';
import { formatTime } from '../lib/date';
import { bristolDescriptions, satisfactionLabels } from '../lib/health';
import { SectionCard } from './SectionCard';

type AnalyticsPanelsProps = {
  range: RangeKey;
  frequency: Array<{ label: string; value: number }>;
  satisfaction: Array<{ date: string; value: number }>;
  bristol: Array<{ name: string; value: number }>;
  heatmap: Array<{
    day: string;
    label: string;
    value: number;
    bristolTypes: Array<1 | 2 | 3 | 4 | 5 | 6 | 7>;
    movements: Array<{
      id: string;
      movementTime: string;
      satisfactionRating: 1 | 2 | 3 | 4 | 5;
      bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      notes: string;
      tags: string[];
    }>;
  }>;
  onRangeChange: (range: RangeKey) => void;
};

const ranges: RangeKey[] = ['today', '7d', '30d', '90d', 'year', 'lifetime'];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const bristolIllustrationByType = {
  1: '/bristol/type-1.svg',
  2: '/bristol/type-2.svg',
  3: '/bristol/type-3.svg',
  4: '/bristol/type-4.svg',
  5: '/bristol/type-5.svg',
  6: '/bristol/type-6.svg',
  7: '/bristol/type-7.svg',
} as const;

const satisfactionClassByRating = {
  1: 'pill--rating-1',
  2: 'pill--rating-2',
  3: 'pill--rating-3',
  4: 'pill--rating-4',
  5: 'pill--rating-5',
} as const;

export function AnalyticsPanels({ range, frequency, satisfaction, bristol, heatmap, onRangeChange }: AnalyticsPanelsProps) {
  const leadingEmptyCells = heatmap.length ? (new Date(heatmap[0].day).getDay() + 6) % 7 : 0;
  const todayKey = formatDayKey(new Date());
  const [selectedMovement, setSelectedMovement] = useState<AnalyticsPanelsProps['heatmap'][number]['movements'][number] | null>(null);

  useEffect(() => {
    if (!selectedMovement) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMovement(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedMovement]);

  return (
    <div className="stack stack--lg">
      <div className="segmented-range" role="tablist" aria-label="analytics range">
        {ranges.map((option) => (
          <button
            key={option}
            type="button"
            className={range === option ? 'segmented-range__button is-active' : 'segmented-range__button'}
            onClick={() => onRangeChange(option)}
          >
            {option === '7d' ? '7 Days' : option === '30d' ? '30 Days' : option === '90d' ? '90 Days' : option === 'year' ? 'Year' : option === 'lifetime' ? 'Lifetime' : 'Today'}
          </button>
        ))}
      </div>

      <div className="analytics-grid">
        <SectionCard title="Satisfaction over time" description="Average satisfaction in the selected window.">
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={satisfaction}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis domain={[0, 5]} tickLine={false} axisLine={false} stroke="#94a3b8" />
                <Tooltip cursor={{ stroke: 'rgba(99, 102, 241, 0.18)' }} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Frequency" description="How often entries happen in the selected window.">
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={frequency}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" radius={[14, 14, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Bristol distribution" description="How your stool types are distributed.">
          <div className="chart-shell chart-shell--pie">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={bristol} dataKey="value" nameKey="name" outerRadius={110} innerRadius={62} paddingAngle={3} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Daily movement grid" className="analytics-grid__full-span">
          {heatmap.length ? (
            <div className="heatmap-calendar" aria-label="Daily movement calendar">
              <div className="heatmap-calendar__weekdays" aria-hidden="true">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday} className="heatmap-calendar__weekday">{weekday}</span>
                ))}
              </div>

              <div className="heatmap-grid" aria-label="Daily movement dates">
                {Array.from({ length: leadingEmptyCells }).map((_, index) => (
                  <div key={`empty-${index}`} className="heatmap-cell heatmap-cell--placeholder" aria-hidden="true" />
                ))}

                {heatmap.map((item) => {
                  const dayOfMonth = new Date(item.day).getDate();
                  const isToday = item.day === todayKey;
                  const averageSatisfaction = item.movements.length
                    ? item.movements.reduce((sum, movement) => sum + movement.satisfactionRating, 0) / item.movements.length
                    : null;
                  const averageRatingClass = averageSatisfaction
                    ? satisfactionClassByRating[Math.max(1, Math.min(5, Math.round(averageSatisfaction))) as 1 | 2 | 3 | 4 | 5]
                    : null;
                  const dayClassName = [
                    'heatmap-cell',
                    item.value === 0 ? 'heatmap-cell--empty' : '',
                    isToday ? 'heatmap-cell--today' : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={item.day}
                      className={dayClassName}
                      style={{ '--intensity': Math.min(1, item.value / 4) } as CSSProperties}
                    >
                      {averageSatisfaction ? (
                        <span className={`pill history-satisfaction-pill ${averageRatingClass} heatmap-cell__avg-score`}>
                          <span className="history-satisfaction-pill__score">{averageSatisfaction.toFixed(1)}</span>
                        </span>
                      ) : null}
                      <strong>{dayOfMonth}</strong>
                      <small className="heatmap-cell__label">{item.label}</small>
                      {item.value === 0 ? (
                        <span>No movement</span>
                      ) : (
                        <>
                          <span>{`${item.value} movement${item.value > 1 ? 's' : ''}`}</span>
                          <div className="heatmap-cell__illustrations" aria-label="Bristol types">
                            {item.movements.map((movement) => (
                              <button
                                key={movement.id}
                                type="button"
                                className="heatmap-cell__illustration-button"
                                onClick={() => setSelectedMovement(movement)}
                                aria-label={`Open movement details for ${formatTime(movement.movementTime)}, Bristol type ${movement.bristolType}`}
                              >
                                <img
                                  src={bristolIllustrationByType[movement.bristolType]}
                                  alt={`Bristol type ${movement.bristolType}`}
                                  className="heatmap-cell__illustration"
                                />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <p className="empty-state">No data in this range yet.</p>}
        </SectionCard>
      </div>

      {selectedMovement ? (
        <div className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="movement-detail-title">
          <div className="edit-modal__backdrop" onClick={() => setSelectedMovement(null)} />
          <section className="edit-modal__panel movement-detail-modal">
            <div className="edit-modal__header">
              <p className="eyebrow">Movement details</p>
              <div className="movement-detail-modal__title-row">
                <h2 id="movement-detail-title">
                  {formatTime(selectedMovement.movementTime)}
                  {' '}
                  <span className="movement-detail-modal__title-date">
                    {new Date(selectedMovement.movementTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </h2>
                <span className={`pill history-satisfaction-pill ${satisfactionClassByRating[selectedMovement.satisfactionRating]}`}>
                  <span className="history-satisfaction-pill__score">{selectedMovement.satisfactionRating}</span>
                  <span>{satisfactionLabels[selectedMovement.satisfactionRating]}</span>
                </span>
              </div>
            </div>

            <div className="movement-detail-modal__grid">
              <div className="movement-detail-modal__section">
                <p className="eyebrow eyebrow--muted">Bristol Type</p>
                <div className="history-bristol-cell movement-detail-modal__bristol">
                  <img
                    src={bristolIllustrationByType[selectedMovement.bristolType]}
                    alt=""
                    aria-hidden="true"
                    className="history-bristol-cell__illustration"
                  />
                  <div className="history-bristol-cell__copy">
                    <strong>Type {selectedMovement.bristolType}</strong>
                    <div className="history-table__subtle">{bristolDescriptions[selectedMovement.bristolType]}</div>
                  </div>
                </div>
              </div>

              <div className="movement-detail-modal__section">
                <p className="eyebrow eyebrow--muted">Tags</p>
                {selectedMovement.tags.length ? (
                  <div className="chip-row">
                    {selectedMovement.tags.map((tag) => (
                      <span key={`${selectedMovement.id}-${tag}`} className="chip">{tag}</span>
                    ))}
                  </div>
                ) : (
                  <p className="helper-text movement-detail-modal__empty">No tags</p>
                )}
              </div>

              <div className="movement-detail-modal__section">
                <p className="eyebrow eyebrow--muted">Notes</p>
                {selectedMovement.notes ? (
                  <p className="movement-detail-modal__notes">{selectedMovement.notes}</p>
                ) : (
                  <p className="helper-text movement-detail-modal__empty">No notes</p>
                )}
              </div>
            </div>

            <div className="quick-log-form__footer">
              <button type="button" className="ghost-button" onClick={() => setSelectedMovement(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
