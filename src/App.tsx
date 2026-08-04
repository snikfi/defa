import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { defaultTags } from './data/mockData';
import type { MovementEntry, RangeKey } from './types';
import { createEntry, loadEntries, persistEntries } from './lib/entries';
import { canUseCloudSync, clearAllEntriesFromCloud, hydrateEntriesFromCloud, pushEntriesToCloud } from './lib/cloudSync';
import { toTimestamp } from './lib/date';
import { getConfiguredOwnerEmail, getCurrentUserId, onAuthStateChange, signInOwner, signOutOwner } from './lib/supabase';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { InstallPromptButton } from './components/InstallPromptButton';
import { QuickLogForm, type QuickLogValues } from './components/QuickLogForm';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/history', label: 'History' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/settings', label: 'Settings' },
] as const;

const APP_ENV = import.meta.env.VITE_APP_ENV ?? (import.meta.env.PROD ? 'production' : 'development');

type PendingDelete = {
  entry: MovementEntry;
  index: number;
  timeoutId: number;
};

function App() {
  const [entries, setEntries] = useState<MovementEntry[]>(() => loadEntries());
  const [editModalEntry, setEditModalEntry] = useState<MovementEntry | null>(null);
  const [duplicateModalEntry, setDuplicateModalEntry] = useState<MovementEntry | null>(null);
  const [range, setRange] = useState<RangeKey>('7d');
  const [syncStatus, setSyncStatus] = useState<string>(canUseCloudSync() ? 'Waiting for first sync' : 'Disabled (missing Supabase environment variables)');
  const [userId, setUserId] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authReady, setAuthReady] = useState(!canUseCloudSync());
  const [deleteCandidate, setDeleteCandidate] = useState<MovementEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const hydrationCompleteRef = useRef(false);
  const modalPanelRef = useRef<HTMLElement | null>(null);
  const deleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const ownerEmail = getConfiguredOwnerEmail() ?? '';

  const draftValues = useMemo<QuickLogValues>(() => {
    const sourceWithRating = entries.find((entry) => entry.hasSatisfactionRating !== false);
    const sourceWithBristol = entries.find((entry) => entry.hasBristolType !== false);
    const source = entries[0];

    return {
      satisfactionRating: sourceWithRating?.satisfactionRating ?? 4,
      bristolType: sourceWithBristol?.bristolType ?? 4,
      notes: '',
      tags: [],
    };
  }, [entries]);

  const editModalValues = useMemo<QuickLogValues | null>(() => {
    if (!editModalEntry) {
      return null;
    }

    return {
      satisfactionRating: editModalEntry.satisfactionRating,
      bristolType: editModalEntry.bristolType,
      notes: editModalEntry.notes,
      tags: editModalEntry.tags,
    };
  }, [editModalEntry]);

  const duplicateModalValues = useMemo<QuickLogValues | null>(() => {
    if (!duplicateModalEntry) {
      return null;
    }

    return {
      satisfactionRating: duplicateModalEntry.satisfactionRating,
      bristolType: duplicateModalEntry.bristolType,
      notes: duplicateModalEntry.notes,
      tags: duplicateModalEntry.tags,
    };
  }, [duplicateModalEntry]);

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
      hasSatisfactionRating: entry.hasSatisfactionRating ?? true,
      hasBristolType: entry.hasBristolType ?? true,
      isNoMovement: entry.isNoMovement ?? entry.hasSatisfactionRating === false,
    }))
      .sort((left, right) => toTimestamp(right.movementTime) - toTimestamp(left.movementTime));

    updateEntries(normalized);
  }

  useEffect(() => {
    return () => {
      if (pendingDelete) {
        window.clearTimeout(pendingDelete.timeoutId);
      }
    };
  }, [pendingDelete]);

  useEffect(() => {
    if (!editModalEntry && !duplicateModalEntry && !deleteCandidate) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (deleteCandidate) {
        setDeleteCandidate(null);
        return;
      }

      if (editModalEntry) {
        setEditModalEntry(null);
        return;
      }

      if (duplicateModalEntry) {
        setDuplicateModalEntry(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [deleteCandidate, duplicateModalEntry, editModalEntry]);

  useEffect(() => {
    if (deleteCandidate) {
      deleteCancelButtonRef.current?.focus();
      return;
    }

    if (editModalEntry || duplicateModalEntry) {
      modalPanelRef.current?.focus();
    }
  }, [deleteCandidate, duplicateModalEntry, editModalEntry]);

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
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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
        const merged = await hydrateEntriesFromCloud([], userId);

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
      if (pendingDelete) {
        window.clearTimeout(pendingDelete.timeoutId);
        setPendingDelete(null);
      }

      await signOutOwner();
      setEntries([]);
      setUserId(null);
      setSyncStatus('Sign in required');
    } catch (error) {
      setSyncStatus(`Sign-out error: ${getSyncErrorMessage(error)}`);
    }
  }

  async function handleDeleteAllData() {
    try {
      if (pendingDelete) {
        window.clearTimeout(pendingDelete.timeoutId);
        setPendingDelete(null);
      }

      if (canUseCloudSync() && userId) {
        setSyncStatus('Deleting all data from cloud...');
        await clearAllEntriesFromCloud(userId);
      }

      setEditModalEntry(null);
      setDuplicateModalEntry(null);
      setDeleteCandidate(null);
      updateEntries([]);
      setSyncStatus(canUseCloudSync() && userId ? 'All data deleted from device and cloud.' : 'All local data deleted.');
    } catch (error) {
      setSyncStatus(`Delete failed: ${getSyncErrorMessage(error)}`);
      throw error;
    }
  }

  if (!authReady) {
    return <div className="app-shell"><div className="app-shell__inner"><p className="helper-text">Loading authentication...</p></div></div>;
  }

  if (canUseCloudSync() && !userId) {
    return <AuthPage defaultEmail={ownerEmail} busy={authBusy} error={authError} onSubmit={handleSignIn} />;
  }

  function handleSubmit(values: QuickLogValues) {
    const nextEntry = createEntry({
      ...values,
      notes: values.notes.trim(),
    });

    updateEntries([nextEntry, ...entries]);
    setDuplicateModalEntry(null);
  }

  function handleEdit(entry: MovementEntry) {
    setDuplicateModalEntry(null);
    setEditModalEntry(entry);
  }

  function handleDuplicate(entry: MovementEntry) {
    setEditModalEntry(null);
    setDuplicateModalEntry(entry);
  }

  function handleDuplicateSubmit(values: QuickLogValues) {
    const nextEntry = createEntry({
      ...values,
      notes: values.notes.trim(),
    });

    setEntries((current) => {
      const updated = [nextEntry, ...current];
      persistEntries(updated);
      return updated;
    });

    setDuplicateModalEntry(null);
  }

  function confirmDelete(entry: MovementEntry) {
    setDeleteCandidate(null);

    if (pendingDelete) {
      window.clearTimeout(pendingDelete.timeoutId);
      setPendingDelete(null);
    }

    const index = entries.findIndex((current) => current.id === entry.id);
    if (index < 0) {
      return;
    }

    updateEntries(entries.filter((current) => current.id !== entry.id));

    const timeoutId = window.setTimeout(() => {
      setPendingDelete(null);
    }, 5000);

    setPendingDelete({
      entry,
      index,
      timeoutId,
    });

    if (editModalEntry?.id === entry.id) {
      setEditModalEntry(null);
    }

    if (duplicateModalEntry?.id === entry.id) {
      setDuplicateModalEntry(null);
    }
  }

  function handleEditSubmit(values: QuickLogValues) {
    if (!editModalEntry) {
      return;
    }

    const editingId = editModalEntry.id;

    setEntries((current) => {
      const updated = current.map((entry) =>
        entry.id === editingId
          ? { ...entry, ...values, notes: values.notes.trim(), tags: values.tags, updatedAt: new Date().toISOString() }
          : entry,
      );
      persistEntries(updated);
      return updated;
    });

    setEditModalEntry(null);
  }

  function handleDelete(entry: MovementEntry) {
    setDeleteCandidate(entry);
  }

  function handleUndoDelete() {
    if (!pendingDelete) {
      return;
    }

    window.clearTimeout(pendingDelete.timeoutId);

    setEntries((current) => {
      if (current.some((entry) => entry.id === pendingDelete.entry.id)) {
        return current;
      }

      const next = [...current];
      const safeIndex = Math.max(0, Math.min(pendingDelete.index, next.length));
      next.splice(safeIndex, 0, pendingDelete.entry);
      persistEntries(next);
      return next;
    });

    setPendingDelete(null);
  }

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <header className="topbar">
          <div className="brand">
            <div className="brand__mark">💩</div>
            <div className="brand__copy">
              <h1>Defa</h1>
            </div>
          </div>

          <nav className="nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')} end={item.path === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar__actions">
            {APP_ENV !== 'production' ? <span className="pill pill--amber">{APP_ENV}</span> : null}
            <InstallPromptButton />
            {canUseCloudSync() ? (
              <button type="button" className="ghost-button" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            ) : null}
          </div>
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
                  editingEntry={null}
                  onSubmit={handleSubmit}
                  onCancelEdit={() => {
                    setDuplicateModalEntry(null);
                  }}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              }
            />
            <Route path="/history" element={<HistoryPage entries={entries} tags={defaultTags} onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />} />
            <Route path="/analytics" element={<AnalyticsPage entries={entries} range={range} onRangeChange={setRange} />} />
            <Route path="/settings" element={<SettingsPage entries={entries} onImportEntries={replaceEntries} syncStatus={syncStatus} onDeleteAllData={handleDeleteAllData} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.main>

        <nav className="mobile-nav" aria-label="Primary mobile">
          {navItems.map((item) => (
            <NavLink key={`mobile-${item.path}`} to={item.path} className={({ isActive }) => (isActive ? 'mobile-nav__link is-active' : 'mobile-nav__link')} end={item.path === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {editModalEntry && editModalValues ? (
          <div className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
            <div className="edit-modal__backdrop" onClick={() => setEditModalEntry(null)} />
            <section className="edit-modal__panel" tabIndex={-1} ref={modalPanelRef}>
              <div className="edit-modal__header">
                <p className="eyebrow">Edit entry</p>
                <h2 id="edit-modal-title">Update movement record</h2>
                <p className="helper-text">Adjust details and save changes.</p>
              </div>
              <QuickLogForm tags={defaultTags} initialValues={editModalValues} editingEntry={editModalEntry} onSubmit={handleEditSubmit} onCancel={() => setEditModalEntry(null)} />
            </section>
          </div>
        ) : null}

        {duplicateModalEntry && duplicateModalValues ? (
          <div className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-modal-title">
            <div className="edit-modal__backdrop" onClick={() => setDuplicateModalEntry(null)} />
            <section className="edit-modal__panel" tabIndex={-1} ref={modalPanelRef}>
              <div className="edit-modal__header">
                <p className="eyebrow">Duplicate entry</p>
                <h2 id="duplicate-modal-title">Create a copy of this record</h2>
                <p className="helper-text">Adjust anything you need, then save the duplicated entry.</p>
              </div>
              <QuickLogForm tags={defaultTags} initialValues={duplicateModalValues} onSubmit={handleDuplicateSubmit} />
            </section>
          </div>
        ) : null}

        {deleteCandidate ? (
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div className="confirm-modal__backdrop" onClick={() => setDeleteCandidate(null)} />
            <div className="confirm-modal__panel">
              <h2 id="delete-modal-title">Delete this record?</h2>
              <p>This action removes the entry now. You can still undo for a few seconds after deletion.</p>
              <div className="confirm-modal__actions">
                <button type="button" className="ghost-button" onClick={() => setDeleteCandidate(null)} ref={deleteCancelButtonRef}>
                  Cancel
                </button>
                <button type="button" className="ghost-button ghost-button--danger" onClick={() => confirmDelete(deleteCandidate)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pendingDelete ? (
          <div className="delete-toast" role="status" aria-live="polite">
            <p>Record deleted.</p>
            <div className="delete-toast__actions">
              <button type="button" className="delete-toast__undo" onClick={handleUndoDelete}>
                Undo
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;