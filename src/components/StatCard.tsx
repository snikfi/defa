type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: 'calm' | 'good' | 'warning' | 'accent';
};

export function StatCard({ label, value, detail, tone = 'calm' }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      <span className="stat-card__detail">{detail}</span>
    </article>
  );
}
