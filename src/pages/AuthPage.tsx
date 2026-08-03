import { useState } from 'react';
import { motion } from 'framer-motion';

type AuthPageProps = {
  defaultEmail: string;
  busy: boolean;
  error: string;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
};

export function AuthPage({ defaultEmail, busy, error, onSubmit }: AuthPageProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');

  return (
    <div className="auth-shell">
      <motion.section
        className="auth-card"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="eyebrow">Owner login</p>
        <h1>Sign in to sync your data</h1>
        <p className="auth-copy">
          Use the same Supabase email and password on every device to keep one unified history.
        </p>

        <form
          className="auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit({ email, password });
          }}
        >
          <label className="setting-field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="setting-field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </motion.section>
    </div>
  );
}
