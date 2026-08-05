import { useRef, type ChangeEvent } from 'react';
import { Download, Moon, Sun, Upload } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FieldWrapper, Select } from '@/components/ui/Field';
import { downloadTextFile } from '@/domain/importExport';
import type { AppState } from '@/types';

const CURRENCY_OPTIONS: { code: string; locale: string; label: string }[] = [
  { code: 'USD', locale: 'en-US', label: 'US Dollar (USD)' },
  { code: 'EUR', locale: 'en-IE', label: 'Euro (EUR)' },
  { code: 'GBP', locale: 'en-GB', label: 'British Pound (GBP)' },
  { code: 'BRL', locale: 'pt-BR', label: 'Brazilian Real (BRL)' },
  { code: 'JPY', locale: 'ja-JP', label: 'Japanese Yen (JPY)' },
  { code: 'CAD', locale: 'en-CA', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', locale: 'en-AU', label: 'Australian Dollar (AUD)' },
];

function isPlausibleBackup(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.transactions) &&
    Array.isArray(v.categories) &&
    Array.isArray(v.budgets) &&
    Array.isArray(v.recurringRules) &&
    typeof v.settings === 'object' &&
    v.settings !== null
  );
}

export function SettingsPage() {
  const { state, updateSettings, resetToDemoData, resetToEmpty, restoreFromBackup } = useApp();
  const { showToast } = useToast();
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const isDark = state.settings.theme === 'dark';

  function handleCurrencyChange(code: string) {
    const option = CURRENCY_OPTIONS.find((c) => c.code === code);
    if (!option) return;
    updateSettings({ currency: option.code, locale: option.locale });
  }

  function handleExportBackup() {
    const json = JSON.stringify(state, null, 2);
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(`centsible-backup-${today}.json`, json, 'application/json');
    showToast({ text: 'Backup downloaded.', tone: 'success' });
  }

  async function handleRestoreFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isPlausibleBackup(parsed)) throw new Error('Unexpected file shape');
      const confirmed = window.confirm('Restore from this backup? Your current data will be replaced. This cannot be undone.');
      if (!confirmed) return;
      restoreFromBackup(parsed);
      showToast({ text: 'Backup restored.', tone: 'success' });
    } catch {
      showToast({ text: "That file doesn't look like a valid Centsible backup.", tone: 'danger' });
    }
  }

  function handleLoadDemoData() {
    const confirmed = window.confirm('Replace all current data with fresh demo data? This cannot be undone.');
    if (!confirmed) return;
    resetToDemoData();
    showToast({ text: 'Demo data loaded.', tone: 'success' });
  }

  function handleClearAll() {
    const confirmed = window.confirm('Delete everything and start with an empty ledger? This cannot be undone.');
    if (!confirmed) return;
    resetToEmpty();
    showToast({ text: 'All data cleared.', tone: 'default' });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 sm:max-w-sm">
          <FieldWrapper label="Currency" htmlFor="settings-currency">
            <Select
              id="settings-currency"
              value={state.settings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <div>
            <p className="mb-1.5 text-sm font-medium text-text">Theme</p>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-raised p-1">
              <button
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-1.5 rounded py-2 text-sm font-medium transition-colors ${
                  !isDark ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                <Sun size={15} /> Light
              </button>
              <button
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex items-center justify-center gap-1.5 rounded py-2 text-sm font-medium transition-colors ${
                  isDark ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                <Moon size={15} /> Dark
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-text-muted">
          Everything lives in this browser's local storage — nothing is sent to a server. Back it up as JSON
          before clearing your browser data or switching devices.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportBackup}>
            Export backup
          </Button>
          <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => restoreInputRef.current?.click()}>
            Restore backup
          </Button>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleRestoreFile}
            aria-label="Restore backup from JSON file"
          />
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleLoadDemoData}>
              Load demo data
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearAll}>
              Clear all data
            </Button>
          </div>
        </div>
      </Card>

      <p className="pb-2 text-center text-xs text-text-faint">
        Centsible — designed and built by Lucas Veríssimo de Oliveira.
      </p>
    </div>
  );
}
