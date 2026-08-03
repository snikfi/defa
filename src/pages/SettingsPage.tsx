import { useEffect, useState } from 'react';
import type { AppSettings, MovementEntry } from '../types';
import { SectionCard } from '../components/SectionCard';
import { defaultSettings } from '../data/mockData';
import { parseCsv, toCsv } from '../lib/entries';
import { readStorage, writeStorage } from '../lib/storage';

type SettingsPageProps = {
  entries: MovementEntry[];
  onImportEntries: (entries: MovementEntry[]) => void;
  syncStatus: string;
};

const SETTINGS_KEY = 'bowel-tracker.settings.v1';

export function SettingsPage({ entries, onImportEntries, syncStatus }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(() => readStorage(SETTINGS_KEY, defaultSettings));
  const [status, setStatus] = useState('');

  useEffect(() => {
    writeStorage(SETTINGS_KEY, settings);
  }, [settings]);

  return (
    <div className="stack stack--lg">
      <SectionCard eyebrow="Security" title="PIN lock and reminders" description="These settings are stored locally for now and will later sync through Supabase.">
        <div className="settings-grid">
          <label className="setting-field">
            <span>PIN lock</span>
            <select className="input" value={settings.pinEnabled ? 'on' : 'off'} onChange={(event) => setSettings({ ...settings, pinEnabled: event.target.value === 'on' })}>
              <option value="on">Enabled</option>
              <option value="off">Disabled</option>
            </select>
          </label>
          <label className="setting-field">
            <span>PIN length</span>
            <input className="input" type="number" min={4} max={8} value={settings.pinLength} onChange={(event) => setSettings({ ...settings, pinLength: Number(event.target.value) })} />
          </label>
          <label className="setting-field">
            <span>Auto-lock minutes</span>
            <input className="input" type="number" min={1} max={60} value={settings.autoLockMinutes} onChange={(event) => setSettings({ ...settings, autoLockMinutes: Number(event.target.value) })} />
          </label>
          <label className="setting-field">
            <span>Daily reminder</span>
            <select className="input" value={settings.reminderEnabled ? 'on' : 'off'} onChange={(event) => setSettings({ ...settings, reminderEnabled: event.target.value === 'on' })}>
              <option value="on">Enabled</option>
              <option value="off">Disabled</option>
            </select>
          </label>
        </div>
      </SectionCard>

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

                try {
                  const text = await file.text();
                  const imported = parseCsv(text);
                  onImportEntries(imported);
                  setStatus(`Imported ${imported.length} entries successfully.`);
                } catch (error) {
                  setStatus(error instanceof Error ? error.message : 'Unable to import CSV.');
                }
              }}
            />
          </label>
        </div>
        <p className="helper-text">{status || 'CSV validation runs before records are replaced.'}</p>
        <p className="helper-text">Cloud sync: {syncStatus}</p>
      </SectionCard>

      <SectionCard eyebrow="Growth" title="Future modules" description="The architecture already leaves room for food, water, fibre, medication, mood, exercise, and AI insights.">
        <ul className="feature-list">
          <li>Supabase sync with row-level security</li>
          <li>Offline cache and background reconciliation</li>
          <li>Apple Health and Google Health Connect integrations</li>
          <li>Doctor reports and PDF exports</li>
        </ul>
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
