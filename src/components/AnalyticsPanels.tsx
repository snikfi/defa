import type { CSSProperties } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RangeKey } from '../types';
import { SectionCard } from './SectionCard';

type AnalyticsPanelsProps = {
  range: RangeKey;
  frequency: Array<{ label: string; value: number }>;
  satisfaction: Array<{ date: string; value: number }>;
  bristol: Array<{ name: string; value: number }>;
  heatmap: Array<{ hour: string; value: number }>;
  onRangeChange: (range: RangeKey) => void;
};

const ranges: RangeKey[] = ['today', '7d', '30d', '90d', 'year', 'lifetime'];

export function AnalyticsPanels({ range, frequency, satisfaction, bristol, heatmap, onRangeChange }: AnalyticsPanelsProps) {
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

        <SectionCard title="Time heatmap" description="When movements usually happen during the day.">
          <div className="heatmap-grid" aria-label="time heatmap">
            {heatmap.length ? heatmap.map((item) => (
              <div key={item.hour} className="heatmap-cell" style={{ '--intensity': Math.min(1, item.value / 4) } as CSSProperties}>
                <strong>{item.hour}:00</strong>
                <span>{item.value}</span>
              </div>
            )) : <p className="empty-state">No data in this range yet.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
