const metrics = [
  { value: '01', label: 'Fast setup with Vite' },
  { value: '02', label: 'Type-safe React foundation' },
  { value: '03', label: 'Responsive starter layout' },
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">React app starter</p>
        <h1>Build something clean, fast, and easy to extend.</h1>
        <p className="lede">
          This project is ready for your next feature. It ships with React, TypeScript,
          and a polished landing screen so you can start building immediately.
        </p>

        <div className="actions">
          <a className="primary-action" href="https://react.dev" target="_blank" rel="noreferrer">
            Learn React
          </a>
          <span className="secondary-action">Edit <strong>src/App.tsx</strong> to begin</span>
        </div>

        <div className="metrics" aria-label="project highlights">
          {metrics.map((metric) => (
            <article key={metric.value} className="metric-card">
              <span>{metric.value}</span>
              <p>{metric.label}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;