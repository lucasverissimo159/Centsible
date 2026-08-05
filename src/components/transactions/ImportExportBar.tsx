import { useRef, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { downloadTextFile, parseImportedTransactions, transactionsToCSV } from '@/domain/importExport';
import type { Transaction } from '@/types';

export function ImportExportBar({ transactions }: { transactions: Transaction[] }) {
  const { state, categoryMap, importTransactions } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const csv = transactionsToCSV(transactions, categoryMap);
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(`centsible-transactions-${today}.csv`, csv, 'text/csv;charset=utf-8;');
    showToast({
      text: `Exported ${transactions.length} transaction${transactions.length === 1 ? '' : 's'}.`,
      tone: 'success',
    });
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-importing the same filename later
    if (!file) return;

    const text = await file.text();
    const { transactions: imported, skippedRows, unmatchedCategoryRows } = parseImportedTransactions(
      text,
      state.categories
    );

    if (imported.length === 0) {
      showToast({ text: "Couldn't find any valid rows in that file.", tone: 'danger' });
      return;
    }

    importTransactions(imported);

    const parts = [`Imported ${imported.length} transaction${imported.length === 1 ? '' : 's'}.`];
    if (skippedRows > 0) parts.push(`Skipped ${skippedRows} unreadable row${skippedRows === 1 ? '' : 's'}.`);
    if (unmatchedCategoryRows > 0) {
      parts.push(`${unmatchedCategoryRows} row${unmatchedCategoryRows === 1 ? '' : 's'} had an unrecognized category, filed under Other.`);
    }
    showToast({ text: parts.join(' '), tone: skippedRows > 0 ? 'default' : 'success' });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
        Export
      </Button>
      <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={handleImportClick}>
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Import transactions from CSV"
      />
    </div>
  );
}
