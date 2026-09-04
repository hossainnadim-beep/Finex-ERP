/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import { 
  formatGAAPCurrency, 
  formatSignedGAAPCurrency,
  formatDDMMYYYY, 
  inferTransactionType, 
  inferPayeeName, 
  getSplitAccountName,
  computeAccountBalances,
  getPresetDateRange,
  ReportPeriodPreset
} from './reportUtils';
import { 
  ChevronLeft, 
  ChevronDown, 
  Printer, 
  Download, 
  Mail, 
  Settings, 
  SlidersHorizontal,
  X, 
  Check, 
  Calendar, 
  FileText,
  Eye,
  Info,
  ExternalLink,
  ChevronUp
} from 'lucide-react';

interface TransactionReportProps {
  company: CompanySettings | null;
  accounts: Account[];
  entries: JournalEntry[];
  initialAccountId?: string;
  startDate: string;
  endDate: string;
  accountingBasis: 'Accrual' | 'Cash';
  onBack: () => void;
  previousReportTitle?: string;
  currencySymbol?: string;
}

export default function TransactionReport({
  company,
  accounts,
  entries,
  initialAccountId,
  startDate: propStartDate,
  endDate: propEndDate,
  accountingBasis: propBasis,
  onBack,
  previousReportTitle,
  currencySymbol: propCurrencySymbol
}: TransactionReportProps) {
  const currencySymbol = propCurrencySymbol || company?.currencySymbol || '$';

  // Active account selection (default to initialAccountId or first account with transactions, or 'all')
  const defaultAccount = useMemo(() => {
    if (initialAccountId) return initialAccountId;
    if (accounts.length > 0) return accounts[0].id;
    return 'all';
  }, [initialAccountId, accounts]);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccount);

  // Period filters
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [startDate, setStartDate] = useState<string>(propStartDate || '2026-08-01');
  const [endDate, setEndDate] = useState<string>(propEndDate || '2026-08-31');
  const [accountingBasis, setAccountingBasis] = useState<'Accrual' | 'Cash'>(propBasis || 'Accrual');

  // Rows / Columns Group By
  const [groupBy, setGroupBy] = useState<'none' | 'account' | 'type' | 'month'>('none');

  // Modern vs Classic view
  const [isModernView, setIsModernView] = useState<boolean>(true);

  // Sorting
  const [sortOrder, setSortOrder] = useState<'date_asc' | 'date_desc' | 'amount_desc'>('date_asc');

  // Presets dropdown
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);

  // Notes
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [customNotes, setCustomNotes] = useState<string>('');

  // Email simulation modal
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailSent, setEmailSent] = useState<boolean>(false);

  // Selected Journal Entry Modal for drill-down to entry line items
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  // Customization modal
  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);
  const [showAdjColumn, setShowAdjColumn] = useState<boolean>(true);
  const [showSplitColumn, setShowSplitColumn] = useState<boolean>(true);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Company Name displayed
  const companyName = company?.legalName || company?.name || 'Whistling Wind Counseling and Therapy Services Inc';

  // Current selected account object
  const currentAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Handle Preset selection
  const handlePresetSelect = (presetKey: ReportPeriodPreset) => {
    setSelectedPreset(presetKey);
    setIsPresetsOpen(false);
    if (presetKey !== 'custom') {
      const range = getPresetDateRange(presetKey);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  // Jump to last handler
  const handleJumpToLast = () => {
    if (reportContainerRef.current) {
      reportContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Calculate beginning balance for selected account (all valid entries before startDate)
  const priorEntries = useMemo(() => {
    return entries.filter(e => e.date < startDate && !e.isReversed);
  }, [entries, startDate]);

  const priorBalances = useMemo(() => {
    return computeAccountBalances(accounts, priorEntries);
  }, [accounts, priorEntries]);

  // Compute Beginning Balance for the account in cents
  const beginningBalanceCents = useMemo(() => {
    if (selectedAccountId === 'all') return 0;
    const b = priorBalances[selectedAccountId];
    if (!b) return 0;
    return b.final;
  }, [priorBalances, selectedAccountId]);

  // Period entries
  const periodEntries = useMemo(() => {
    const list = entries.filter(e => e.date >= startDate && e.date <= endDate && !e.isReversed);
    return list.sort((a, b) => {
      if (sortOrder === 'date_desc') return b.date.localeCompare(a.date);
      return a.date.localeCompare(b.date);
    });
  }, [entries, startDate, endDate, sortOrder]);

  // Build Transaction Report Rows for the active account
  const transactionRows = useMemo(() => {
    const rows: Array<{
      id: string;
      entryId: string;
      date: string;
      formattedDate: string;
      transactionType: string;
      referenceNumber: string;
      isAdjustment: boolean;
      name: string;
      memo: string;
      accountId: string;
      accountName: string;
      splitAccount: string;
      amountCents: number; // Signed change
      runningBalanceCents: number;
      entry: JournalEntry;
    }> = [];

    let running = beginningBalanceCents;

    periodEntries.forEach(entry => {
      // Find lines matching selected account (or all if 'all')
      const targetLines = selectedAccountId === 'all'
        ? entry.lines
        : entry.lines.filter(l => l.accountId === selectedAccountId);

      targetLines.forEach(line => {
        const acc = accounts.find(a => a.id === line.accountId);
        if (!acc) return;

        // Calculate signed amount for this account
        // If NormalBalance is Debit (Assets, Expenses):
        // Debits increase (+), Credits decrease (-)
        // If NormalBalance is Credit (Liabilities, Equity, Revenue):
        // Credits increase (+), Debits decrease (-)
        let amountChange = 0;
        if (acc.normalBalance === 'Debit') {
          amountChange = line.debit - line.credit;
        } else {
          amountChange = line.credit - line.debit;
        }

        running += amountChange;

        const splitName = getSplitAccountName(entry, acc.id, accounts);
        const payee = inferPayeeName(entry, splitName);
        const txType = inferTransactionType(entry, acc.id, accounts);

        rows.push({
          id: `${entry.id}-${line.id}`,
          entryId: entry.id,
          date: entry.date,
          formattedDate: formatDDMMYYYY(entry.date),
          transactionType: txType,
          referenceNumber: entry.reference || entry.id,
          isAdjustment: entry.reference?.toUpperCase().includes('ADJ') || entry.isReversed,
          name: payee,
          memo: entry.description,
          accountId: acc.id,
          accountName: `${acc.id} ${acc.name}`,
          splitAccount: splitName,
          amountCents: amountChange,
          runningBalanceCents: running,
          entry
        });
      });
    });

    if (sortOrder === 'amount_desc') {
      return [...rows].sort((a, b) => Math.abs(b.amountCents) - Math.abs(a.amountCents));
    }

    return rows;
  }, [periodEntries, selectedAccountId, accounts, beginningBalanceCents, sortOrder]);

  // Total change during period
  const totalAmountChangeCents = useMemo(() => {
    return transactionRows.reduce((sum, r) => sum + r.amountCents, 0);
  }, [transactionRows]);

  // Ending balance
  const endingBalanceCents = beginningBalanceCents + totalAmountChangeCents;

  // Subtitle date period e.g. "August 2026" or "01/08/2026 to 31/08/2026"
  const formattedPeriodSubtitle = useMemo(() => {
    const startFormatted = formatDDMMYYYY(startDate);
    const endFormatted = formatDDMMYYYY(endDate);
    
    // Check if whole month
    const [sY, sM, sD] = startDate.split('-');
    const [eY, eM, eD] = endDate.split('-');
    if (sY === eY && sM === eM && sD === '01') {
      const monthDate = new Date(Number(sY), Number(sM) - 1, 1);
      return monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return `${startFormatted} to ${endFormatted}`;
  }, [startDate, endDate]);

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Date', 'Transaction Type', '#', 'ADJ', 'Name', 'Memo/Description', 'Account', 'Split', 'Amount', 'Balance'];
    const csvRows = [headers.join(',')];

    // Beginning balance row
    csvRows.push(['', '', '', '', 'Beginning Balance', '', currentAccount ? `${currentAccount.id} ${currentAccount.name}` : '', '', '', (beginningBalanceCents / 100).toFixed(2)].map(v => `"${v}"`).join(','));

    // Data rows
    transactionRows.forEach(r => {
      csvRows.push([
        r.formattedDate,
        r.transactionType,
        r.referenceNumber,
        r.isAdjustment ? 'Yes' : 'No',
        r.name,
        r.memo,
        r.accountName,
        r.splitAccount,
        (r.amountCents / 100).toFixed(2),
        (r.runningBalanceCents / 100).toFixed(2)
      ].map(v => `"${v.toString().replace(/"/g, '""')}"`).join(','));
    });

    // Total row
    csvRows.push(['', '', '', '', `Total for ${currentAccount ? `${currentAccount.id} ${currentAccount.name}` : 'All Accounts'}`, '', '', '', (totalAmountChangeCents / 100).toFixed(2), (endingBalanceCents / 100).toFixed(2)].map(v => `"${v}"`).join(','));

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Transaction_Report_${currentAccount?.id || 'all'}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 text-slate-900 pb-16 font-sans">
      
      {/* TOP NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 print:hidden">
        <div className="flex items-center gap-6">
          {/* Back link */}
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to {previousReportTitle || 'report list'}</span>
          </button>

          {/* Run Presets button / dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsPresetsOpen(!isPresetsOpen)}
              className="text-[#990000] hover:text-[#770000] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Run Presets</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isPresetsOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded shadow-lg z-30 py-1 text-xs">
                <button
                  onClick={() => handlePresetSelect('this_month')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  This Month
                </button>
                <button
                  onClick={() => handlePresetSelect('last_month')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Last Month
                </button>
                <button
                  onClick={() => handlePresetSelect('this_quarter')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  This Quarter
                </button>
                <button
                  onClick={() => handlePresetSelect('this_year_ytd')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  This Year-to-date
                </button>
                <button
                  onClick={() => handlePresetSelect('last_year')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Last Fiscal Year
                </button>
                <button
                  onClick={() => handlePresetSelect('all_time')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  All Time
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          QuickZoom Drill-Down Breakdown
        </div>
      </div>

      {/* REPORT TITLE */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Transaction Report
        </h1>
      </div>

      {/* FILTER & CONFIGURATION PANEL (matching screenshot) */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 print:hidden space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            
            {/* Report period */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Report period
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelect(e.target.value as ReportPeriodPreset)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year_ytd">This Year-to-date</option>
                  <option value="last_year">Last Fiscal Year</option>
                  <option value="all_time">All Time</option>
                </select>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Rows/columns: Group by */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Rows/columns
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-600">Group by</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="account">Account</option>
                  <option value="type">Transaction Type</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>

            {/* Accounting method */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Accounting method
              </label>
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-800">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="basis"
                    checked={accountingBasis === 'Cash'}
                    onChange={() => setAccountingBasis('Cash')}
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Cash</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="basis"
                    checked={accountingBasis === 'Accrual'}
                    onChange={() => setAccountingBasis('Accrual')}
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Accrual</span>
                </label>
              </div>
            </div>

            {/* Change account */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Change account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none min-w-[160px]"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.id} {acc.name}
                  </option>
                ))}
                <option value="all">All Accounts</option>
              </select>
            </div>

            {/* Run report button */}
            <button
              onClick={() => {
                // Triggers fresh calculation
              }}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded transition-colors shadow-sm cursor-pointer"
            >
              Run report
            </button>
          </div>

          {/* Right side controls: Switch to modern view, Jump To Last, Customize, Save customization */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsModernView(!isModernView)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
            >
              {isModernView ? 'Switch to classic view' : 'Switch to modern view'}
            </button>

            <button
              onClick={handleJumpToLast}
              className="px-3 py-1.5 bg-[#7a1c1c] hover:bg-[#601414] text-white text-xs font-semibold rounded transition-colors shadow-sm"
            >
              Jump To Last
            </button>

            <button
              onClick={() => setShowCustomizeModal(true)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors"
            >
              Customize
            </button>

            <button
              onClick={() => {
                alert('Report configuration saved to company preferences.');
              }}
              className="px-3 py-1.5 bg-[#13543d] hover:bg-[#0e402e] text-white text-xs font-semibold rounded transition-colors shadow-sm"
            >
              Save customization
            </button>
          </div>
        </div>
      </div>

      {/* FILTER TAGS / PILLS ROW */}
      <div className="flex items-center gap-2 text-xs print:hidden">
        <span className="font-semibold text-slate-600">Filters:</span>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 font-medium text-xs">
          <span>Distribution Account: {currentAccount ? `${currentAccount.id} ${currentAccount.name}` : 'All Accounts'}</span>
          <button
            onClick={() => setSelectedAccountId('all')}
            className="hover:text-rose-600 cursor-pointer text-slate-500"
            title="Remove filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ACTION STRIP (Sort, Notes, Sub-Rows, Email, Print, Export, Settings) */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-slate-200 print:hidden text-xs">
        
        {/* Left: Sort & Add notes */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium cursor-pointer"
            >
              <span>Sort</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isSortOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded shadow-lg z-20 py-1">
                <button
                  onClick={() => { setSortOrder('date_asc'); setIsSortOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${sortOrder === 'date_asc' ? 'font-bold text-blue-600' : 'text-slate-700'}`}
                >
                  Date (Ascending)
                </button>
                <button
                  onClick={() => { setSortOrder('date_desc'); setIsSortOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${sortOrder === 'date_desc' ? 'font-bold text-blue-600' : 'text-slate-700'}`}
                >
                  Date (Descending)
                </button>
                <button
                  onClick={() => { setSortOrder('amount_desc'); setIsSortOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${sortOrder === 'amount_desc' ? 'font-bold text-blue-600' : 'text-slate-700'}`}
                >
                  Amount (Highest first)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            {showNotes ? 'Hide notes' : 'Add notes'}
          </button>
        </div>

        {/* Right: Sub-Rows, Email, Print, Export, Settings */}
        <div className="flex items-center gap-3 text-slate-600">
          <span className="text-[11px] text-slate-500 font-mono">
            ^^ Sub-Rows ({transactionRows.length} transactions)
          </span>

          <button
            onClick={() => setShowEmailModal(true)}
            className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Email report"
          >
            <Mail className="w-4 h-4" />
          </button>

          <button
            onClick={() => window.print()}
            className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Print report"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCustomizeModal(true)}
            className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Report settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* OPTIONAL NOTES INPUT BLOCK */}
      {showNotes && (
        <div className="bg-amber-50/50 border border-amber-200 rounded p-3 text-xs print:hidden">
          <label className="block font-semibold text-slate-800 mb-1">
            Account Audit Notes:
          </label>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Enter notes, verification details, or auditor comments for this account breakdown..."
            rows={2}
            className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* THE REPORT SHEET (White Paper Document Canvas) */}
      <div 
        ref={reportContainerRef}
        className="bg-white border border-slate-300 rounded shadow-sm p-6 sm:p-10 text-slate-900 print:shadow-none print:border-none print:p-0"
      >
        
        {/* CENTERED HEADER */}
        <div className="text-center space-y-1 mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif tracking-tight">
            {companyName}
          </h2>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-wide uppercase">
            Transaction Report
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            {formattedPeriodSubtitle}
          </p>
          {currentAccount && (
            <p className="text-xs text-blue-700 font-semibold font-mono pt-1">
              Account: {currentAccount.id} - {currentAccount.name} ({currentAccount.class}, Normal Balance: {currentAccount.normalBalance})
            </p>
          )}
        </div>

        {/* TRANSACTION BREAKDOWN TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-800 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2 px-2 text-left">DATE</th>
                <th className="py-2 px-2 text-left">TRANSACTION TYPE</th>
                <th className="py-2 px-2 text-left">#</th>
                {showAdjColumn && <th className="py-2 px-2 text-center">ADJ</th>}
                <th className="py-2 px-2 text-left">NAME</th>
                <th className="py-2 px-2 text-left">MEMO/DESCRIPTION</th>
                <th className="py-2 px-2 text-left">ACCOUNT</th>
                {showSplitColumn && <th className="py-2 px-2 text-left">SPLIT</th>}
                <th className="py-2 px-2 text-right">AMOUNT</th>
                <th className="py-2 px-2 text-right">BALANCE</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              
              {/* BEGINNING BALANCE ROW */}
              <tr className="bg-slate-50/70 text-slate-800 font-semibold border-b border-slate-200">
                <td className="py-2 px-2 font-mono text-slate-500"></td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2"></td>
                {showAdjColumn && <td className="py-2 px-2"></td>}
                <td className="py-2 px-2 font-bold text-slate-900">
                  Beginning Balance
                </td>
                <td className="py-2 px-2 text-slate-500 italic">
                  Balance forward as of {formatDDMMYYYY(startDate)}
                </td>
                <td className="py-2 px-2 font-mono text-slate-700">
                  {currentAccount ? `${currentAccount.id} ${currentAccount.name}` : ''}
                </td>
                {showSplitColumn && <td className="py-2 px-2"></td>}
                <td className="py-2 px-2 text-right font-mono"></td>
                <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                  {formatSignedGAAPCurrency(beginningBalanceCents, currencySymbol)}
                </td>
              </tr>

              {/* ITEM ROWS */}
              {transactionRows.map(row => (
                <tr 
                  key={row.id}
                  onClick={() => setViewingEntry(row.entry)}
                  className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                  title="Click to view full journal entry details"
                >
                  <td className="py-2 px-2 font-mono text-slate-700 whitespace-nowrap">
                    {row.formattedDate}
                  </td>
                  <td className="py-2 px-2 text-slate-800 font-medium">
                    {row.transactionType}
                  </td>
                  <td className="py-2 px-2 font-mono text-blue-600 font-medium group-hover:underline">
                    {row.referenceNumber}
                  </td>
                  {showAdjColumn && (
                    <td className="py-2 px-2 text-center text-slate-600">
                      {row.isAdjustment ? 'Yes' : 'No'}
                    </td>
                  )}
                  <td className="py-2 px-2 font-medium text-slate-900 max-w-[180px] truncate">
                    {row.name}
                  </td>
                  <td className="py-2 px-2 text-slate-700 max-w-[220px] truncate">
                    {row.memo}
                  </td>
                  <td className="py-2 px-2 font-mono text-slate-800 whitespace-nowrap">
                    {row.accountName}
                  </td>
                  {showSplitColumn && (
                    <td className="py-2 px-2 text-slate-600 max-w-[160px] truncate">
                      {row.splitAccount}
                    </td>
                  )}
                  <td className="py-2 px-2 text-right font-mono font-medium whitespace-nowrap text-slate-900">
                    {formatSignedGAAPCurrency(row.amountCents, currencySymbol)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold whitespace-nowrap text-slate-900">
                    {formatSignedGAAPCurrency(row.runningBalanceCents, currencySymbol)}
                  </td>
                </tr>
              ))}

              {transactionRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-500 italic">
                    No transactions recorded for this account between {formatDDMMYYYY(startDate)} and {formatDDMMYYYY(endDate)}.
                  </td>
                </tr>
              )}

              {/* TOTAL ROW */}
              <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-slate-900">
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-2"></td>
                {showAdjColumn && <td className="py-2.5 px-2"></td>}
                <td colSpan={3} className="py-2.5 px-2">
                  Total for {currentAccount ? `${currentAccount.id} ${currentAccount.name}` : 'All Accounts'}
                </td>
                {showSplitColumn && <td className="py-2.5 px-2"></td>}
                <td className="py-2.5 px-2 text-right font-mono font-bold whitespace-nowrap">
                  {formatSignedGAAPCurrency(totalAmountChangeCents, currencySymbol)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono font-bold underline decoration-double decoration-2 whitespace-nowrap">
                  {formatSignedGAAPCurrency(endingBalanceCents, currencySymbol)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* CUSTOM NOTES ON REPORT PAPER */}
        {customNotes && (
          <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-700">
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1">
              Auditor / Management Notes:
            </h5>
            <p className="whitespace-pre-wrap">{customNotes}</p>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-12 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center text-[10px] text-slate-500">
          <div>
            Generated on {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} • Accounting Basis: {accountingBasis}
          </div>
          <div className="font-mono">
            Finex Dual-Entry General Ledger System
          </div>
        </div>
      </div>

      {/* JOURNAL ENTRY DETAIL MODAL (DRILL DOWN TO SOURCE POSTING) */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm leading-none">Journal Entry {viewingEntry.reference || viewingEntry.id}</h3>
                  <span className="text-[11px] text-slate-400">Date: {formatDDMMYYYY(viewingEntry.date)}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingEntry(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Reference</span>
                  <span className="font-mono font-bold text-slate-900">{viewingEntry.reference || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Posting Date</span>
                  <span className="font-medium text-slate-900">{formatDDMMYYYY(viewingEntry.date)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Created By</span>
                  <span className="font-medium text-slate-900 truncate block">{viewingEntry.createdBy || 'System'}</span>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Description / Memo</span>
                  <span className="text-slate-800 font-medium">{viewingEntry.description}</span>
                </div>
              </div>

              {/* LINES TABLE */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3 text-right">Debit</th>
                      <th className="py-2 px-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingEntry.lines.map((line, idx) => {
                      const acc = accounts.find(a => a.id === line.accountId);
                      const isHighlighted = acc?.id === selectedAccountId;
                      return (
                        <tr key={idx} className={isHighlighted ? 'bg-blue-50/70 font-semibold' : ''}>
                          <td className="py-2 px-3">
                            <span className="font-mono text-slate-700 mr-2 font-bold">#{line.accountId}</span>
                            <span className="text-slate-900">{acc?.name || 'Account'}</span>
                            {isHighlighted && (
                              <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {line.debit > 0 ? formatGAAPCurrency(line.debit, currencySymbol) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {line.credit > 0 ? formatGAAPCurrency(line.credit, currencySymbol) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td className="py-2 px-3 text-slate-800">Total</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatGAAPCurrency(viewingEntry.lines.reduce((s, l) => s + l.debit, 0), currencySymbol)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatGAAPCurrency(viewingEntry.lines.reduce((s, l) => s + l.credit, 0), currencySymbol)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                  <Check className="w-4 h-4" />
                  <span>Dual-entry debits equal credits</span>
                </div>
                <button
                  onClick={() => setViewingEntry(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE MODAL */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Customize Transaction Report</h3>
              <button onClick={() => setShowCustomizeModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAdjColumn}
                  onChange={(e) => setShowAdjColumn(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-800 font-medium">Show ADJ (Adjustment) column</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSplitColumn}
                  onChange={(e) => setShowSplitColumn(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-800 font-medium">Show SPLIT (Counter-Account) column</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Email Transaction Report</h3>
              <button onClick={() => { setShowEmailModal(false); setEmailSent(false); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {emailSent ? (
              <div className="py-4 text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Report Dispatched</h4>
                <p className="text-xs text-slate-600">The transaction report for {currentAccount?.name} has been emailed to {emailTo}.</p>
                <button
                  onClick={() => { setShowEmailModal(false); setEmailSent(false); }}
                  className="mt-2 px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Recipient Email:</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="accountant@corporate.com"
                    className="w-full p-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject:</label>
                  <input
                    type="text"
                    defaultValue={`Transaction Report - ${currentAccount ? `${currentAccount.id} ${currentAccount.name}` : 'All Accounts'} (${formattedPeriodSubtitle})`}
                    className="w-full p-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (emailTo) {
                        setEmailSent(true);
                      } else {
                        alert('Please enter a recipient email address.');
                      }
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded"
                  >
                    Send Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
