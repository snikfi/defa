import type { ReactNode } from 'react';

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ eyebrow, title, description, action, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <div>
          {eyebrow ? <p className="eyebrow eyebrow--muted">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? <p className="section-card__description">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
