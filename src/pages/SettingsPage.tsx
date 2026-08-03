import { useState } from 'react';
import type { MovementEntry } from '../types';
import { SectionCard } from '../components/SectionCard';
import { parseCsv, toCsv } from '../lib/entries';

type SettingsPageProps = {
  entries: MovementEntry[];
  onImportEntries: (entries: MovementEntry[]) => void;
  syncStatus: string;
};

export function SettingsPage({ entries, onImportEntries, syncStatus }: SettingsPageProps) {
  const [status, setStatus] = useState<{ tone: 'idle' | 'progress' | 'success' | 'error'; message: string }>({
    tone: 'idle',
    message: 'CSV validation runs before records are replaced.',
  });
  const [selectedFileName, setSelectedFileName] = useState('');

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
        {status.tone === 'success' ? <p className="form-feedback form-feedback--success" role="status" aria-live="polite">{status.message}</p> : null}
        {status.tone === 'error' ? <p className="form-feedback form-feedback--error" role="alert">{status.message}</p> : null}
        {status.tone === 'progress' ? <p className="helper-text" role="status" aria-live="polite">{status.message}</p> : null}
        {status.tone === 'idle' ? <p className="helper-text">{status.message}</p> : null}
        <p className="helper-text">Cloud sync: {syncStatus}</p>
      </SectionCard>
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
