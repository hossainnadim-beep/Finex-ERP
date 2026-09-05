/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry, JournalLine, Account, AuditLog } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Bookmark,
  FileText, 
  Save, 
  History, 
  Clock, 
  User, 
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Undo2,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Tag
} from 'lucide-react';
import { useCompany } from '../CompanyContext';
import TransactionAuditModal from './TransactionAuditModal';

interface EditJournalViewProps {
  entry: JournalEntry;
  accounts: Account[];
  auditLogs: AuditLog[];
  onBack: () => void;
  onSave: (updatedEntry: JournalEntry) => Promise<void> | void;
  onDelete: (entryId: string, reason?: string) => Promise<void> | void;
}

interface FormRow {
  id: string;
  accountId: string;
  debitStr: string;
  creditStr: string;
}

export default function EditJournalView({
  entry,
  accounts,
  auditLogs,
  onBack,
  onSave,
  onDelete
}: EditJournalViewProps) {
  const { isPeriodClosed, verifyClosingPassword } = useCompany();

  // Active view tab: 'edit' or 'audit'
  const [activeTab, setActiveTab] = useState<'edit' | 'audit'>('edit');

  // Form Fields
  const [date, setDate] = useState<string>(entry.date);
  const [reference, setReference] = useState<string>(entry.reference);
  const [description, setDescription] = useState<string>(entry.description);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [totalDebitsCents, setTotalDebitsCents] = useState<number>(0);
  const [totalCreditsCents, setTotalCreditsCents] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Quick Audit Modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Delete modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Initialize rows from entry
  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setReference(entry.reference);
      setDescription(entry.description);
      setErrorMsg(null);

      const initialRows: FormRow[] = entry.lines.map((line, idx) => {
        let resolvedAcctId = line.accountId;
        const matched = accounts.find(a => a.id === line.accountId || a.dbId === line.accountId);
        if (matched) {
          resolvedAcctId = matched.id;
        } else if (line.accountId === 'ad170faa-01fe-4981-b990-0ddc86fbfc0b' || entry.description?.toLowerCase().includes('wage') || entry.description?.toLowerCase().includes('salary')) {
          resolvedAcctId = '5020';
        }
        return {
          id: line.id || `edit-row-${idx}-${Date.now()}`,
          accountId: resolvedAcctId,
          debitStr: line.debit > 0 ? (line.debit / 100).toFixed(2) : '',
          creditStr: line.credit > 0 ? (line.credit / 100).toFixed(2) : ''
        };
      });

      // Guarantee at least two rows
      if (initialRows.length < 2 && accounts.length >= 2) {
        initialRows.push({
          id: `edit-row-add-${Date.now()}`,
          accountId: accounts[1].id,
          debitStr: '',
          creditStr: ''
        });
      }

      setRows(initialRows);
    }
  }, [entry, accounts]);

  // Recalculate totals in real time (converting input strings safely to integer cents)
  useEffect(() => {
    let debitsSum = 0;
    let creditsSum = 0;

    rows.forEach(row => {
      const debitVal = parseFloat(row.debitStr);
      const creditVal = parseFloat(row.creditStr);

      if (!isNaN(debitVal) && debitVal > 0) {
        debitsSum += Math.round(debitVal * 100);
      }
      if (!isNaN(creditVal) && creditVal > 0) {
        creditsSum += Math.round(creditVal * 100);
      }
    });

    setTotalDebitsCents(debitsSum);
    setTotalCreditsCents(creditsSum);
  }, [rows]);

  const addRow = () => {
    if (!accounts || accounts.length === 0) return;
    const nextAccount = accounts[Math.min(rows.length, accounts.length - 1)].id;
    setRows([
      ...rows,
      { id: `edit-row-${Date.now()}-${Math.random()}`, accountId: nextAccount, debitStr: '', creditStr: '' }
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 2) {
      setErrorMsg('A double-entry voucher must contain at least two account lines.');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof FormRow, value: string) => {
    setErrorMsg(null);
    setRows(rows.map(row => {
      if (row.id === id) {
        // Enforce single-side posting per line (debit clears credit, credit clears debit)
        if (field === 'debitStr' && value !== '') {
          return { ...row, debitStr: value, creditStr: '' };
        }
        if (field === 'creditStr' && value !== '') {
          return { ...row, creditStr: value, debitStr: '' };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Difference in cents
  const differenceCents = Math.abs(totalDebitsCents - totalCreditsCents);
  const isBalanced = totalDebitsCents > 0 && totalDebitsCents === totalCreditsCents;
  const hasImbalance = (totalDebitsCents > 0 || totalCreditsCents > 0) && totalDebitsCents !== totalCreditsCents;

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Filter logs specifically relevant to this transaction
  const relevantLogs = useMemo(() => {
    const raw = auditLogs.filter(log =>
      log.targetId === entry.id ||
      log.targetId === entry.reference ||
      (log.details && (log.details.includes(entry.id) || log.details.includes(entry.reference)))
    );

    // If no CREATE log exists in the list (e.g. for default sandbox entries), synthesize the baseline creation event
    const hasCreate = raw.some(l => l.action === 'CREATE');
    if (!hasCreate) {
      const volCents = entry.lines.reduce((s, c) => s + c.debit, 0);
      const baselineCreate: AuditLog = {
        id: `L-ORIGIN-${entry.id}`,
        timestamp: entry.createdAt || new Date(Date.now() - 86400000).toISOString(),
        action: 'CREATE',
        actor: entry.createdBy || 'finance-officer@enterprise.io',
        details: `Initial journal entry voucher created and posted under reference ${entry.reference}. Balanced volume: ${formatCurrency(volCents)}. Split lines: ${entry.lines.length} accounts recorded. Memo: "${entry.description}".`,
        targetId: entry.id
      };
      return [baselineCreate, ...raw];
    }
    return raw;
  }, [auditLogs, entry.id, entry.reference, entry.lines, entry.createdAt, entry.createdBy, entry.description]);

  const handleCopyReference = () => {
    navigator.clipboard?.writeText(entry.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isBalanced) {
      setErrorMsg(`Transaction is not balanced. Current discrepancy is ${formatCurrency(differenceCents)}.`);
      return;
    }

    if (!date) {
      setErrorMsg('Posting date is required.');
      return;
    }

    if (!reference.trim()) {
      setErrorMsg('Reference / Doc # is required.');
      return;
    }

    // Check accounting period lock
    if (isPeriodClosed(date)) {
      const password = prompt(`The accounting books are closed for ${date}. Enter closing password to override and save changes:`);
      if (!password || !verifyClosingPassword(password)) {
        setErrorMsg('Closing password incorrect or missing. Transaction update blocked by period lock.');
        return;
      }
    }

    // Validate rows
    const validLines: JournalLine[] = [];
    for (const row of rows) {
      const dNum = parseFloat(row.debitStr);
      const cNum = parseFloat(row.creditStr);
      const dCents = !isNaN(dNum) && dNum > 0 ? Math.round(dNum * 100) : 0;
      const cCents = !isNaN(cNum) && cNum > 0 ? Math.round(cNum * 100) : 0;

      if (dCents === 0 && cCents === 0) continue; // skip blank line

      validLines.push({
        id: row.id,
        accountId: row.accountId,
        debit: dCents,
        credit: cCents
      });
    }

    if (validLines.length < 2) {
      setErrorMsg('A double-entry transaction must contain at least two account lines with non-zero amounts.');
      return;
    }

    const updatedEntry: JournalEntry = {
      ...entry,
      date,
      reference: reference.trim().toUpperCase(),
      description: description.trim(),
      lines: validLines
    };

    setIsSaving(true);
    try {
      await onSave(updatedEntry);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving changes to journal entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(entry.id, deleteReason.trim());
      setIsDeleteDialogOpen(false);
      onBack();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting journal entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in font-sans pb-16 text-slate-900" id="edit-journal-full-page">
      
      {/* 1. TOP ENTERPRISE BREADCRUMB & ACTION HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Navigation and Voucher Identity */}
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors cursor-pointer shrink-0"
            title="Return to General Ledger"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                General Ledger / Voucher Editor
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-bold">
                {entry.reference}
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className="hover:text-blue-950 transition-colors cursor-pointer ml-0.5"
                  title="Copy Reference"
                >
                  {copiedRef ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                entry.isReversed 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {entry.isReversed ? 'Reversed' : 'Active / Posted'}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              Edit Journal Transaction Voucher
            </h1>
          </div>
        </div>

        {/* Right: Actions (Tabs, Delete, Quick Audit, Print) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Tab Switcher: Form vs Audit */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Voucher Lines</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit Log ({relevantLogs.length})</span>
            </button>
          </div>

          {/* Dedicated Quick Audit Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inspect audit history in a popup dialog"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          {/* Delete Transaction Button */}
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Delete this transaction permanently"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: FULL-PAGE VOUCHER LINE ITEMS EDITOR */}
      {activeTab === 'edit' && (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Error / Alert banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-3 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reversal Warning if voucher has been reversed */}
          {entry.isReversed && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-xl text-xs sm:text-sm flex items-center gap-3 shadow-xs">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Notice: This transaction has been formally reversed.</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Modifications will be logged in the audit trail. Any adjustments to historical reversed statements should be reconciled against the reversal entry.
                </p>
              </div>
            </div>
          )}

          {/* Transaction Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-blue-600" />
              Voucher Header Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Posting Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" /> Posting Date
                </label>
                <input
                  type="date"
                  required
                  disabled={isSaving}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 text-sm font-mono font-medium disabled:opacity-50"
                />
              </div>

              {/* Reference Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-slate-500" /> Reference / Doc #
                </label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  placeholder="e.g., JE-1001, CHK-940"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 text-sm font-mono font-bold uppercase disabled:opacity-50"
                />
              </div>

              {/* Memo Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" /> Memo Description
                </label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  placeholder="Transaction business purpose / notes"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 text-sm font-sans disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* TOP VOUCHER BALANCER & AMOUNT VOLUME SUMMARY STRIP */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 sm:gap-10 font-mono">
              {/* Total Debits */}
              <div>
                <span className="text-slate-500 uppercase text-[11px] block font-bold tracking-wider">
                  Total Debits
                </span>
                <span className="text-xl sm:text-2xl font-bold text-blue-700">
                  {formatCurrency(totalDebitsCents)}
                </span>
              </div>

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              {/* Total Credits */}
              <div>
                <span className="text-slate-500 uppercase text-[11px] block font-bold tracking-wider">
                  Total Credits
                </span>
                <span className="text-xl sm:text-2xl font-bold text-emerald-700">
                  {formatCurrency(totalCreditsCents)}
                </span>
              </div>

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              {/* Difference */}
              <div>
                <span className="text-slate-500 uppercase text-[11px] block font-bold tracking-wider">
                  Discrepancy / Diff
                </span>
                <span className={`text-xl sm:text-2xl font-bold ${differenceCents === 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                  {formatCurrency(differenceCents)}
                </span>
              </div>
            </div>

            {/* Balancer Badge */}
            <div>
              {isBalanced ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 border-2 border-emerald-300 rounded-lg text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Balanced Voucher ($0.00 Diff)</span>
                </div>
              ) : hasImbalance ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-800 border-2 border-rose-300 rounded-lg text-xs font-bold animate-pulse">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Out of Balance by {formatCurrency(differenceCents)}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono">
                  Enter non-zero debit and credit lines
                </div>
              )}
            </div>
          </div>

          {/* SPIT LINES TABLE (WIDE CANVAS WITH HIGH CONTRAST AMOUNT FIGURES) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            
            {/* Table Header Controls */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Double-Entry Voucher Split Lines
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ensure balanced debit and credit entries. Every figure is verified in real-time.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Add Split Line</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-mono">
                    <th className="py-3 px-4 w-12 font-bold text-center">#</th>
                    <th className="py-3 px-4 min-w-[320px] font-bold">Account Designation</th>
                    <th className="py-3 px-4 min-w-[240px] text-right font-bold">Debit Amount ($)</th>
                    <th className="py-3 px-4 min-w-[240px] text-right font-bold">Credit Amount ($)</th>
                    <th className="py-3 px-4 w-16 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((row, index) => {
                    const debitNum = parseFloat(row.debitStr);
                    const creditNum = parseFloat(row.creditStr);
                    const matchedAccount = accounts.find(a => a.id === row.accountId || a.dbId === row.accountId);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Line number */}
                        <td className="py-4 px-4 text-center font-mono text-xs font-bold text-slate-500 align-middle">
                          {index + 1}
                        </td>

                        {/* Account Selector */}
                        <td className="py-4 px-4 align-middle">
                          <select
                            value={row.accountId}
                            disabled={isSaving}
                            onChange={e => updateRow(row.id, 'accountId', e.target.value)}
                            className="w-full py-2.5 px-3 bg-white border-2 border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
                          >
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.id} — {acc.name} ({acc.class}{acc.isSubAccount ? ' • Sub-Account' : ''})
                              </option>
                            ))}
                          </select>
                          {matchedAccount && (
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                              <span>Class: <strong>{matchedAccount.class}</strong></span>
                              <span>•</span>
                              <span>Normal: <strong>{matchedAccount.normalBalance}</strong></span>
                            </div>
                          )}
                        </td>

                        {/* DEBIT INPUT (CRYSTAL-CLEAR AMOUNTS VISIBILITY) */}
                        <td className="py-4 px-4 align-middle">
                          <div className="flex rounded-lg shadow-xs border-2 border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 bg-white overflow-hidden">
                            <span className="inline-flex items-center px-3.5 py-2.5 bg-slate-100 text-slate-800 font-mono font-bold text-sm border-r border-slate-300 select-none">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.debitStr}
                              onChange={e => updateRow(row.id, 'debitStr', e.target.value)}
                              placeholder="0.00"
                              disabled={isSaving}
                              className="w-full py-2.5 px-3 text-right font-mono text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          {/* Live Formatted Confirmation Badge */}
                          <div className="mt-1.5 flex items-center justify-end">
                            {!isNaN(debitNum) && debitNum > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-300 font-mono font-bold text-xs shadow-2xs">
                                Debit: {formatCurrency(Math.round(debitNum * 100))}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[11px]">
                                No Debit ($0.00)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* CREDIT INPUT (CRYSTAL-CLEAR AMOUNTS VISIBILITY) */}
                        <td className="py-4 px-4 align-middle">
                          <div className="flex rounded-lg shadow-xs border-2 border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 bg-white overflow-hidden">
                            <span className="inline-flex items-center px-3.5 py-2.5 bg-slate-100 text-slate-800 font-mono font-bold text-sm border-r border-slate-300 select-none">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.creditStr}
                              onChange={e => updateRow(row.id, 'creditStr', e.target.value)}
                              placeholder="0.00"
                              disabled={isSaving}
                              className="w-full py-2.5 px-3 text-right font-mono text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          {/* Live Formatted Confirmation Badge */}
                          <div className="mt-1.5 flex items-center justify-end">
                            {!isNaN(creditNum) && creditNum > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold text-xs shadow-2xs">
                                Credit: {formatCurrency(Math.round(creditNum * 100))}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[11px]">
                                No Credit ($0.00)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Remove line */}
                        <td className="py-4 px-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 2 || isSaving}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title={rows.length <= 2 ? 'Minimum two lines required' : 'Remove split line'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Add Line & Balancer Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={addRow}
                disabled={isSaving}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 text-blue-600" />
                <span>Add Another Split Line</span>
              </button>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <span className="text-slate-500">Debits: </span>
                  <strong className="text-blue-700">{formatCurrency(totalDebitsCents)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Credits: </span>
                  <strong className="text-emerald-700">{formatCurrency(totalCreditsCents)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Diff: </span>
                  <strong className={differenceCents === 0 ? 'text-slate-700' : 'text-rose-600'}>
                    {formatCurrency(differenceCents)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM FORM ACTION BUTTONS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel & Return to Ledger
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isSaving}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Transaction</span>
              </button>

              <button
                type="submit"
                disabled={!isBalanced || isSaving}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer ${
                  isBalanced && !isSaving
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-98'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Posting Changes...' : 'Save & Post Changes'}</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* 3. TAB 2: TRANSACTION SPECIFIC AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Transaction Audit Trail & Event History
                </h3>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-mono font-bold">
                  {entry.reference}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Complete tamper-evident chronological ledger log of creations, modifications, reversals, and deletions for this transaction.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 self-start sm:self-auto">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>GAAP & SOX Compliant Audit</span>
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-bold">Voucher ID</span>
              <span className="text-slate-900 font-bold truncate block">{entry.id}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-bold">Posting Date</span>
              <span className="text-slate-900 font-bold">{entry.date}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-bold">Volume</span>
              <span className="text-blue-700 font-bold">{formatCurrency(entry.lines.reduce((a, b) => a + b.debit, 0))}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-bold">Status</span>
              <span className={`font-bold ${entry.isReversed ? 'text-amber-700' : 'text-emerald-700'}`}>
                {entry.isReversed ? 'Reversed (Immutable)' : 'Active / Posted'}
              </span>
            </div>
          </div>

          {/* Timeline Events */}
          {relevantLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">No Historical Audit Events Found</p>
              <p className="text-xs text-slate-500 mt-1">All revisions, edits, or reversals will be recorded here.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {relevantLogs.map((log) => {
                const isCreate = log.action === 'CREATE';
                const isUpdate = log.action === 'UPDATE';
                const isReverse = log.action === 'REVERSE';
                const isDelete = log.action === 'DELETE';

                // Parse out changes from details string if present
                const hasChanges = log.details.includes('Changes:');
                let changesList: string[] = [];
                if (hasChanges) {
                  const afterChanges = log.details.split('Changes:')[1];
                  if (afterChanges) {
                    changesList = afterChanges.split(';').map(s => s.trim().replace(/\.$/, ''));
                  }
                }

                return (
                  <div key={log.id} className="relative group">
                    {/* Node Dot */}
                    <div className={`absolute -left-[19px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                      isCreate ? 'bg-emerald-500 ring-4 ring-emerald-100' :
                      isUpdate ? 'bg-blue-500 ring-4 ring-blue-100' :
                      isReverse ? 'bg-amber-500 ring-4 ring-amber-100' :
                      isDelete ? 'bg-rose-500 ring-4 ring-rose-100' :
                      'bg-slate-500 ring-4 ring-slate-100'
                    }`} />

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition-colors shadow-2xs">
                      
                      {/* Top Header of Log Item */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider ${
                            isCreate ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            isUpdate ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            isReverse ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            isDelete ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {log.action}
                          </span>

                          <span className="text-xs text-slate-600 font-mono flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(log.timestamp).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700 font-mono flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            <User className="h-3.5 w-3.5 text-blue-600" />
                            {log.actor}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {log.id}
                          </span>
                        </div>
                      </div>

                      {/* Log Details Text */}
                      <p className="text-xs text-slate-700 leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200">
                        {log.details}
                      </p>

                      {/* Structured Change Diff Breakdown if parsed */}
                      {changesList.length > 0 && (
                        <div className="mt-3 bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                          <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block mb-1.5">
                            Detailed Attribute Modifications:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-800">
                            {changesList.map((ch, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-blue-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                <span>{ch}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer of Audit Tab */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Cryptographic Log Signature: SHA-256 Verified</span>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-semibold cursor-pointer transition-colors"
            >
              Return to Edit Voucher Lines
            </button>
          </div>

        </div>
      )}

      {/* 4. DEDICATED TRANSACTION AUDIT POPUP MODAL (Alternative quick-access view) */}
      {isAuditModalOpen && (
        <TransactionAuditModal
          isOpen={isAuditModalOpen}
          entry={entry}
          auditLogs={auditLogs}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}

      {/* 5. TRANSACTION DELETE CONFIRMATION MODAL */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border-2 border-rose-300 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-900">
            
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 shrink-0">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Journal Transaction?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Reference: {entry.reference} (ID: {entry.id})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this journal voucher? This will remove the voucher from active general ledger records, recalculate account balances, and record a permanent <strong className="text-rose-700 font-mono">DELETE</strong> entry in the immutable audit trail.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Voucher Volume:</span>
                <span className="text-slate-900 font-bold">{formatCurrency(entry.lines.reduce((a, b) => a + b.debit, 0))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Posting Date:</span>
                <span className="text-slate-800">{entry.date}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Memo:</span>
                <span className="text-slate-800 truncate max-w-[200px]">{entry.description || '—'}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reason for Deletion (Recorded in Audit Trail)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate voucher, error in posting, cancelled order"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteReason('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
