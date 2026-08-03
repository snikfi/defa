import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { defaultTags } from './data/mockData';
import type { MovementEntry, RangeKey } from './types';
import { createEntry, loadEntries, persistEntries, remapEntryIds } from './lib/entries';
import { canUseCloudSync, hydrateEntriesFromCloud, pushEntriesToCloud } from './lib/cloudSync';
import { getConfiguredOwnerEmail, getCurrentUserId, onAuthStateChange, signInOwner, signOutOwner } from './lib/supabase';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import type { QuickLogValues } from './components/QuickLogForm';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'History' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/settings', label: 'Settings' },
] as const;

const STORAGE_LAST_SYNC_USER_ID = 'bowel-tracker.last-sync-user-id.v1';

function App() {
  const [entries, setEntries] = useState<MovementEntry[]>(() => loadEntries());
  const [editingEntry, setEditingEntry] = useState<MovementEntry | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<MovementEntry | null>(null);
  const [range, setRange] = useState<RangeKey>('7d');
  const [syncStatus, setSyncStatus] = useState<string>(canUseCloudSync() ? 'Waiting for first sync' : 'Disabled (missing Supabase environment variables)');
  const [userId, setUserId] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authReady, setAuthReady] = useState(!canUseCloudSync());
  const hydrationCompleteRef = useRef(false);
  const ownerEmail = getConfiguredOwnerEmail() ?? '';

  const draftValues = useMemo<QuickLogValues>(() => {
    const source = editingEntry ?? duplicateSeed ?? entries[0];

    return {
      satisfactionRating: source?.satisfactionRating ?? 4,
      bristolType: source?.bristolType ?? 4,
      notes: source?.notes ?? '',
      tags: source?.tags ?? [],
    };
  }, [duplicateSeed, editingEntry, entries]);

  function updateEntries(next: MovementEntry[]) {
    setEntries(next);
    persistEntries(next);
  }

  function getSyncErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown sync error';
    }
  }

  function replaceEntries(next: MovementEntry[]) {
    const normalized = next.map((entry) => ({
      ...entry,
      updatedAt: entry.updatedAt ?? entry.createdAt,
    }));

    updateEntries(normalized);
  }

  useEffect(() => {
    if (!canUseCloudSync()) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const id = await getCurrentUserId();
        if (!active) return;
        setUserId(id);
        setSyncStatus(id ? 'Waiting for first sync' : 'Sign in required');
      } finally {
        if (active) {
          setAuthReady(true);
        }
      }
    })();

    const unsubscribe = onAuthStateChange(async () => {
      const id = await getCurrentUserId();
      setUserId(id);
      setSyncStatus(id ? 'Waiting for first sync' : 'Sign in required');
      hydrationCompleteRef.current = false;
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!canUseCloudSync() || !userId) {
      return;
    }

    const previousUserId = window.localStorage.getItem(STORAGE_LAST_SYNC_USER_ID);

    if (previousUserId !== userId && entries.length) {
      const remappedEntries = remapEntryIds(entries);
      replaceEntries(remappedEntries);
    }

    window.localStorage.setItem(STORAGE_LAST_SYNC_USER_ID, userId);
  }, [userId]);

  useEffect(() => {
    let isCancelled = false;

    async function hydrate() {
      if (!canUseCloudSync()) {
        hydrationCompleteRef.current = true;
        return;
      }

      if (!userId) {
        hydrationCompleteRef.current = true;
        return;
      }

      try {
        setSyncStatus('Syncing from cloud...');
        const merged = await hydrateEntriesFromCloud(entries, userId);

        if (!isCancelled) {
          updateEntries(merged);
          setSyncStatus('Synced');
        }
      } catch (error) {
        if (!isCancelled) {
          setSyncStatus(`Sync error: ${getSyncErrorMessage(error)}`);
        }
      } finally {
        hydrationCompleteRef.current = true;
      }
    }

    void hydrate();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!canUseCloudSync() || !hydrationCompleteRef.current || !userId) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setSyncStatus('Uploading changes...');
        await pushEntriesToCloud(entries, userId);
        setSyncStatus('Synced');
      } catch (error) {
        setSyncStatus(`Sync error: ${getSyncErrorMessage(error)}`);
      }
    }, 800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [entries, userId]);

  async function handleSignIn(values: { email: string; password: string }) {
    setAuthBusy(true);
    setAuthError('');

    try {
      const id = await signInOwner(values);
      if (!id) {
        throw new Error('Unable to resolve account ID after sign-in.');
      }

      setUserId(id);
      setSyncStatus('Waiting for first sync');
    } catch (error) {
      setAuthError(getSyncErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutOwner();
      setUserId(null);
      setSyncStatus('Sign in required');
    } catch (error) {
      setSyncStatus(`Sign-out error: ${getSyncErrorMessage(error)}`);
    }
  }

  if (!authReady) {
    return <div className="app-shell"><div className="app-shell__inner"><p className="helper-text">Loading authentication...</p></div></div>;
  }

  if (canUseCloudSync() && !userId) {
    return <AuthPage defaultEmail={ownerEmail} busy={authBusy} error={authError} onSubmit={handleSignIn} />;
  }

  function handleSubmit(values: QuickLogValues) {
    if (editingEntry) {
      const updated = entries.map((entry) =>
        entry.id === editingEntry.id
          ? { ...entry, ...values, notes: values.notes.trim(), tags: values.tags, updatedAt: new Date().toISOString() }
          : entry,
      );

      updateEntries(updated);
      setEditingEntry(null);
      setDuplicateSeed(null);
      return;
    }

    const nextEntry = createEntry({
      ...values,
      notes: values.notes.trim(),
    });

    updateEntries([nextEntry, ...entries]);
    setDuplicateSeed(null);
  }

  function handleEdit(entry: MovementEntry) {
    setEditingEntry(entry);
    setDuplicateSeed(null);
  }

  function handleDuplicate(entry: MovementEntry) {
    setEditingEntry(null);
    setDuplicateSeed(entry);
  }

  function handleDelete(entry: MovementEntry) {
    updateEntries(entries.filter((current) => current.id !== entry.id));
    if (editingEntry?.id === entry.id) {
      setEditingEntry(null);
    }
  }

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <header className="topbar">
          <div className="brand">
            <div className="brand__mark">💩</div>
            <div className="brand__copy">
              <h1>Digest</h1>
              <p>Personal bowel movement tracker</p>
            </div>
          </div>

          <nav className="nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')} end={item.path === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          {canUseCloudSync() ? (
            <button type="button" className="ghost-button" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          ) : null}
        </header>

        <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  entries={entries}
                  tags={defaultTags}
                  draftValues={draftValues}
                  editingEntry={editingEntry}
                  onSubmit={handleSubmit}
                  onCancelEdit={() => {
                    setEditingEntry(null);
                    setDuplicateSeed(null);
                  }}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              }
            />
            <Route path="/history" element={<HistoryPage entries={entries} tags={defaultTags} onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />} />
            <Route path="/analytics" element={<AnalyticsPage entries={entries} range={range} onRangeChange={setRange} />} />
            <Route path="/settings" element={<SettingsPage entries={entries} onImportEntries={replaceEntries} syncStatus={syncStatus} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.main>
      </div>
    </div>
  );
}

export default App;