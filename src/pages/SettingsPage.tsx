import { useEffect, useState } from 'react';
import type { MovementEntry } from '../types';
import { SectionCard } from '../components/SectionCard';
import { parseCsv, toCsv } from '../lib/entries';

type SettingsPageProps = {
  entries: MovementEntry[];
  onImportEntries: (entries: MovementEntry[]) => void;
  onDeleteAllData: () => Promise<void>;
  syncStatus: string;
};

export function SettingsPage({ entries, onImportEntries, onDeleteAllData, syncStatus }: SettingsPageProps) {
  const [status, setStatus] = useState<{ tone: 'idle' | 'progress' | 'success' | 'error'; message: string }>({
    tone: 'idle',
    message: 'CSV validation runs before records are replaced.',
  });
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);

  const lastBackupStr = window.localStorage.getItem('bowel-tracker.last-backup');
  const lastBackupLabel = lastBackupStr
    ? `Last auto-backup: ${new Date(lastBackupStr).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
    : 'No auto-backup yet';

  useEffect(() => {
    if (!showDeleteAllConfirm) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleteAllBusy) {
        setShowDeleteAllConfirm(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [deleteAllBusy, showDeleteAllConfirm]);

  return (
    <div className="stack stack--lg">
      <SectionCard eyebrow="Data" title="Export and import CSV" description="Export your data now, or import a validated CSV later without losing history.">
        <div className="action-row">
          <button className="primary-button" type="button" onClick={() => downloadCsv(entries)}>
            Export CSV
          </button>
          <label className="ghost-button ghost-button--file">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                setSelectedFileName(file.name);
                setStatus({ tone: 'progress', message: `Importing ${file.name}...` });

                try {
                  const text = await file.text();
                  const imported = parseCsv(text);
                  onImportEntries(imported);
                  setStatus({ tone: 'success', message: `Imported ${imported.length} entries successfully.` });
                } catch (error) {
                  setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to import CSV.' });
                } finally {
                  // Allow selecting the same file again and re-triggering import.
                  event.currentTarget.value = '';
                }
              }}
            />
          </label>
        </div>

        <p className="helper-text">Selected file: {selectedFileName || 'None yet'}</p>
        <p className="helper-text">
          Date columns accepted: ISO is recommended (example: 2026-07-17T08:45:00Z). Also supported: unix epoch (seconds/milliseconds), yyyy-MM-dd HH:mm[:ss], M/d/yyyy H:mm[:ss], and d/M/yyyy H:mm[:ss].
        </p>
        {status.tone === 'success' ? <p className="form-feedback form-feedback--success" role="status" aria-live="polite">{status.message}</p> : null}
        {status.tone === 'error' ? <p className="form-feedback form-feedback--error" role="alert">{status.message}</p> : null}
        {status.tone === 'progress' ? <p className="helper-text" role="status" aria-live="polite">{status.message}</p> : null}
        {status.tone === 'idle' ? <p className="helper-text">{status.message}</p> : null}
        <p className="helper-text">Cloud sync: {syncStatus}</p>
        <p className="helper-text">{lastBackupLabel}</p>
      </SectionCard>

      <SectionCard eyebrow="Danger zone" title="Delete all data" description="This removes all records from this device and your cloud database account.">
        <div className="action-row">
          <button type="button" className="ghost-button ghost-button--danger" onClick={() => setShowDeleteAllConfirm(true)} disabled={deleteAllBusy || entries.length === 0}>
            Delete all data
          </button>
        </div>
        <p className="helper-text">{entries.length === 0 ? 'No entries to delete right now.' : 'This cannot be undone.'}</p>
      </SectionCard>

      {showDeleteAllConfirm ? (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-all-title">
          <div className="confirm-modal__backdrop" onClick={() => (deleteAllBusy ? null : setShowDeleteAllConfirm(false))} />
          <div className="confirm-modal__panel">
            <h2 id="delete-all-title">Delete all records?</h2>
            <p>This will permanently delete every entry from this device and your cloud database.</p>
            <div className="confirm-modal__actions">
              <button type="button" className="ghost-button" onClick={() => setShowDeleteAllConfirm(false)} disabled={deleteAllBusy}>
                Cancel
              </button>
              <button
                type="button"
                className="ghost-button ghost-button--danger"
                disabled={deleteAllBusy}
                onClick={async () => {
                  setDeleteAllBusy(true);
                  try {
                    await onDeleteAllData();
                    setStatus({ tone: 'success', message: 'All data deleted from device and cloud.' });
                    setShowDeleteAllConfirm(false);
                  } catch (error) {
                    setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to delete all data.' });
                  } finally {
                    setDeleteAllBusy(false);
                  }
                }}
              >
                {deleteAllBusy ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function downloadCsv(entries: MovementEntry[]) {
  const blob = new Blob([toCsv(entries)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bowel-movement-tracker.csv';
  link.click();
  URL.revokeObjectURL(url);
}
