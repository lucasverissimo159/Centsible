import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, Moon, Sun, Upload } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FieldWrapper, Select } from '@/components/ui/Field';
import { downloadTextFile } from '@/domain/importExport';
import { validateAppState } from '@/domain/validation';
import { clearApiSession, fetchRemoteState, fetchUsers, getCurrentUserRole, hasApiSession, updateUserRole, type OrganizationUser } from '@/api/client';
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

export function SettingsPage() {
  const { state, updateSettings, resetToDemoData, resetToEmpty, restoreFromBackup } = useApp();
  const { showToast } = useToast();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isDark = state.settings.theme === 'dark';
  const apiSession = hasApiSession();
  const currentRole = getCurrentUserRole();
  const canManageUsers = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const isDevEnvironment = import.meta.env.DEV || window.location.hostname === 'localhost';

  useEffect(() => {
    if (!apiSession || !canManageUsers) return;

    async function loadUsers() {
      try {
        setLoadingUsers(true);
        setUsers(await fetchUsers());
      } catch (error) {
        showToast({ text: error instanceof Error ? error.message : 'Could not load team members.', tone: 'danger' });
      } finally {
        setLoadingUsers(false);
      }
    }

    void loadUsers();
  }, [apiSession, canManageUsers, showToast]);

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
      const validation = validateAppState(parsed);
      if (!validation.valid) throw new Error(validation.errors.slice(0, 2).join(' '));
      const confirmed = window.confirm('Restore from this backup? Your current data will be replaced. This cannot be undone.');
      if (!confirmed) return;
      restoreFromBackup(parsed as AppState);
      showToast({ text: 'Backup restored.', tone: 'success' });
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : '';
      showToast({ text: `That file isn't a valid Centsible backup.${detail}`, tone: 'danger' });
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

  async function handleSyncFromServer() {
    try {
      restoreFromBackup(await fetchRemoteState(state));
      showToast({ text: 'Server data synchronized.', tone: 'success' });
    } catch (error) {
      showToast({ text: error instanceof Error ? error.message : 'Could not synchronize server data.', tone: 'danger' });
    }
  }

  async function handleRoleChange(userId: string, nextRole: OrganizationUser['role']) {
    try {
      const updatedUser = await updateUserRole(userId, nextRole);
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      showToast({ text: `${updatedUser.email} is now ${updatedUser.role}.`, tone: 'success' });
    } catch (error) {
      showToast({ text: error instanceof Error ? error.message : 'Could not update user role.', tone: 'danger' });
    }
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

      {canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle>Team access</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {loadingUsers ? (
              <p className="text-sm text-text-muted">Loading team members...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-text-muted">No team members found for this organization.</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-text">{user.email}</p>
                    <p className="text-xs text-text-muted">{user.id}</p>
                  </div>
                  <div className="w-full sm:max-w-56">
                    <Select value={user.role} onChange={(event) => void handleRoleChange(user.id, event.target.value as OrganizationUser['role'])}>
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

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
          {apiSession && (
            <>
              <Button variant="secondary" size="sm" onClick={() => void handleSyncFromServer()}>
                Sync from server
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  clearApiSession();
                  showToast({ text: 'Signed out from server.', tone: 'default' });
                }}
              >
                Sign out
              </Button>
            </>
          )}
        </div>

        {isDevEnvironment && (
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Developer tools</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleLoadDemoData}>
                Load demo data
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearAll}>
                Clear all data
              </Button>
            </div>
          </div>
        )}
      </Card>

      <p className="pb-2 text-center text-xs text-text-faint">
        Centsible — designed and built by Lucas Veríssimo de Oliveira.
      </p>
    </div>
  );
}
