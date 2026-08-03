import type { MovementEntry, RangeKey } from '../types';
import { SectionCard } from '../components/SectionCard';
import { AnalyticsPanels } from '../components/AnalyticsPanels';
import { getBestAndWorstWeeks, getChartSeries, getLongestGap } from '../lib/health';

type AnalyticsPageProps = {
  entries: MovementEntry[];
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
};

export function AnalyticsPage({ entries, range, onRangeChange }: AnalyticsPageProps) {
  const series = getChartSeries(entries, range);
  const { best, worst } = getBestAndWorstWeeks(entries);
  const longestGap = getLongestGap(entries);

  return (
    <div className="stack stack--lg">
      <SectionCard eyebrow="Analytics" title="Patterns and trends" description="Interactive charts for satisfaction, frequency, stool distribution, and time-of-day patterns.">
        <div className="insight-grid">
          <article className="insight-card">
            <span>Longest gap</span>
            <strong>{longestGap ? `${longestGap.toFixed(1)} days` : 'Not enough data'}</strong>
          </article>
          <article className="insight-card">
            <span>Best week</span>
            <strong>{best ? `${best.average.toFixed(1)}/5` : 'Not enough data'}</strong>
          </article>
          <article className="insight-card">
            <span>Worst week</span>
            <strong>{worst ? `${worst.average.toFixed(1)}/5` : 'Not enough data'}</strong>
          </article>
          <article className="insight-card">
            <span>Trend</span>
            <strong>{best && worst ? 'Stable foundation' : 'Collect more data'}</strong>
          </article>
        </div>
      </SectionCard>

      <AnalyticsPanels
        range={range}
        frequency={series.frequency}
        satisfaction={series.satisfaction}
        bristol={series.bristol}
        heatmap={series.heatmap}
        onRangeChange={onRangeChange}
      />
    </div>
  );
}
