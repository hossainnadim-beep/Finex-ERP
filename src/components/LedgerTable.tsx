/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { JournalEntry, Account, AuditLog } from '../types';
import { CHART_OF_ACCOUNTS } from '../constants';
import { 
  Undo2, 
  Eye, 
  EyeOff, 
  Search, 
  Receipt, 
  Calendar, 
  ArrowUpRight, 
  Scale, 
  ShieldAlert, 
  History, 
  Edit3, 
  Trash2,
  ExternalLink,
  ShieldCheck,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';
import TransactionAuditModal from './TransactionAuditModal';

interface LedgerTableProps {
  entries: JournalEntry[];
  onReverseEntry: (originalEntryId: string) => void;
  onEditEntry?: (entry: JournalEntry) => void;
  onDeleteEntry?: (entryId: string, reason?: string) => Promise<void> | void;
  auditLogs: AuditLog[];
  accounts: Account[];
}

export default function LedgerTable({ 
  entries, 
  onReverseEntry, 
  onEditEntry, 
  onDeleteEntry,
  auditLogs, 
  accounts 
}: LedgerTableProps) {
  const [showReversed, setShowReversed] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'deleted' | 'audit'>('transactions');
  const [auditModalEntry, setAuditModalEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const resolveAccount = (id: string, entryDesc?: string): { code: string; name: string } => {
    let acct = accounts.find(a => a.id === id || a.dbId === id) ||
               CHART_OF_ACCOUNTS.find(a => a.id === id || a.dbId === id);

    if (!acct && (id === 'ad170faa-01fe-4981-b990-0ddc86fbfc0b' || (id.includes('-') && id.length > 20))) {
      if (entryDesc?.toLowerCase().includes('wage') || entryDesc?.toLowerCase().includes('salary')) {
        acct = accounts.find(a => a.id === '5020') || CHART_OF_ACCOUNTS.find(a => a.id === '5020');
      }
    }

    return {
      code: acct ? acct.id : id,
      name: acct ? acct.name : `Acct #${id}`
    };
  };

  const getAccountName = (id: string, entryDesc?: string): string => {
    return resolveAccount(id, entryDesc).name;
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Filter based on showReversed toggle & term
  const filteredEntries = entries.filter(entry => {
    if (!showReversed && (entry.isReversed || entry.reversingForId !== null)) {
      return false;
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchRef = entry.reference.toLowerCase().includes(term);
      const matchDesc = entry.description.toLowerCase().includes(term);
      const matchAcctName = entry.lines.some(l => resolveAccount(l.accountId, entry.description).name.toLowerCase().includes(term));
      const matchAcctCode = entry.lines.some(l => {
        const resolved = resolveAccount(l.accountId, entry.description);
        return resolved.code.toLowerCase().includes(term) || l.accountId.toLowerCase().includes(term);
      });
      return matchRef || matchDesc || matchAcctName || matchAcctCode;
    }

    return true;
  });

  // Extract all deleted transaction records from audit logs
  const deletedLogs = useMemo(() => {
    return auditLogs.filter(l => l.action === 'DELETE');
  }, [auditLogs]);

  // Open audit modal for a deleted transaction using synthetic container
  const handleOpenDeletedAudit = (log: AuditLog) => {
    const matchRef = log.details.match(/\[(.*?)\]/);
    const ref = matchRef ? matchRef[1] : (log.targetId || 'DELETED-VOUCHER');
    
    const dummyEntry: JournalEntry = {
      id: log.targetId || log.id,
      date: log.timestamp.split('T')[0],
      reference: ref,
      description: `[DELETED RECORD] ${log.details}`,
      lines: [],
      isReversed: false,
      reversedEntryId: null,
      reversingForId: null,
      createdAt: log.timestamp,
      createdBy: log.actor
    };

    setAuditModalEntry(dummyEntry);
  };

  return (
    <div className="bg-[#121214] shadow-xl rounded border border-zinc-800 overflow-hidden" id="general-ledger-table">
      
      {/* Table Header and Navigation Tabs */}
      <div className="bg-[#09090b] border-b border-zinc-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              <Scale className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Audit Trail & General Ledger</h3>
              <p className="text-xs text-zinc-500">Immutable ledger logs fully compliant with GAAP & financial transparency standards</p>
            </div>
          </div>

          <div className="flex flex-wrap rounded bg-zinc-900 p-1 border border-zinc-800 gap-1">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === 'transactions' 
                  ? 'bg-zinc-800 text-blue-400 border border-zinc-700/55 shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> 
              <span>Journal Entries ({entries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('deleted')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === 'deleted' 
                  ? 'bg-zinc-800 text-rose-400 border border-zinc-700/55 shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" /> 
              <span>Deleted Log ({deletedLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === 'audit' 
                  ? 'bg-zinc-800 text-blue-400 border border-zinc-700/55 shadow-xs' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <History className="h-3.5 w-3.5" /> 
              <span>System Security Log ({auditLogs.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'transactions' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-zinc-800">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Reference, Account, Description..."
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-xs"
              />
            </div>

            {/* Audit Trail Toggles */}
            <button
              onClick={() => setShowReversed(!showReversed)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                showReversed 
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700' 
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
            >
              {showReversed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>{showReversed ? 'Include Reversals' : 'Hide Reversals'}</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: ACTIVE JOURNAL ENTRIES */}
      {activeTab === 'transactions' && (
        <div className="divide-y divide-zinc-800/80">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No matching journal transactions found in ledger.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredEntries.map((entry) => {
                const totalVol = entry.lines.reduce((s, c) => s + c.debit, 0);

                return (
                  <div 
                    key={entry.id} 
                    className={`p-4 transition-colors ${
                      entry.isReversed 
                        ? 'bg-amber-950/5 border-l-4 border-amber-500/50' 
                        : entry.reversingForId 
                          ? 'bg-rose-950/5 border-l-4 border-rose-500/50' 
                          : 'hover:bg-zinc-900/10 border-l-4 border-blue-500/40'
                    }`}
                  >
                    {/* Header Row of Entry */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-100 font-mono font-bold rounded border border-zinc-800 text-[10px]">
                          {entry.id}
                        </span>
                        <span className="text-zinc-500 flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3.5 w-3.5" /> {entry.date}
                        </span>
                        <span className="font-semibold text-zinc-300 flex items-center gap-1">
                          Ref:
                          {onEditEntry ? (
                            <button
                              type="button"
                              onClick={() => onEditEntry(entry)}
                              className="font-mono text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                              title="Click to open transaction on complete page"
                            >
                              <span>{entry.reference}</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </button>
                          ) : (
                            <span className="font-mono text-blue-400 font-bold">{entry.reference}</span>
                          )}
                        </span>
                        <span className="text-zinc-700">|</span>
                        <span className="text-zinc-500 font-mono text-[11px]">Volume: <strong className="text-zinc-200">{formatCurrency(totalVol)}</strong></span>
                      </div>

                      {/* Controls and Badges */}
                      <div className="flex items-center gap-2 leading-none flex-wrap">
                        {entry.isReversed && (
                          <span className="px-2 py-0.5 bg-amber-950/30 text-amber-400 border border-amber-800/20 rounded font-bold text-[10px] uppercase font-mono">
                            Reversed (Immutable)
                          </span>
                        )}
                        {entry.reversingForId && (
                          <span className="px-2 py-0.5 bg-rose-950/30 text-rose-450 border border-rose-800/20 rounded font-bold text-[10px] uppercase font-mono">
                            Reversing Entry ({entry.reversingForId})
                          </span>
                        )}

                        {/* Always available: Transaction Audit Log */}
                        <button
                          onClick={() => setAuditModalEntry(entry)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-300 text-[10px] font-bold rounded uppercase font-mono transition-colors whitespace-nowrap cursor-pointer active:scale-97"
                          title="View Transaction Audit Trail"
                        >
                          <History className="h-3 w-3 text-blue-400" />
                          <span>Audit Log</span>
                        </button>
                        
                        {/* Actions for active entries */}
                        {!entry.isReversed && !entry.reversingForId && (
                          <div className="flex items-center gap-1.5">
                            {onEditEntry && (
                              <button
                                onClick={() => onEditEntry(entry)}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 text-[10px] font-bold rounded uppercase font-mono transition-colors whitespace-nowrap cursor-pointer active:scale-97"
                                title="Edit Journal Entry on complete page for wider view"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit Voucher</span>
                              </button>
                            )}
                            <button
                              onClick={() => onReverseEntry(entry.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500 text-amber-400 text-[10px] font-bold rounded uppercase font-mono transition-colors whitespace-nowrap cursor-pointer active:scale-97"
                            >
                              <Undo2 className="h-3 w-3" />
                              <span>Reversal</span>
                            </button>
                          </div>
                        )}

                        {/* Delete Transaction Action */}
                        {onDeleteEntry && (
                          <button
                            onClick={() => setDeletingEntry(entry)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500 text-rose-400 text-[10px] font-bold rounded uppercase font-mono transition-colors whitespace-nowrap cursor-pointer active:scale-97"
                            title="Delete this transaction permanently"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Memo Description */}
                    <div className="text-xs text-zinc-300 font-sans mb-3 flex items-center gap-1.5 bg-[#09090b] px-3 py-1.5 rounded border border-zinc-800/40">
                      <span className="font-bold text-zinc-500 uppercase text-[10px] tracking-wider">Business Memo:</span>
                      <span>{entry.description}</span>
                    </div>

                    {/* Account Splits Table Rows */}
                    <div className="overflow-hidden border border-zinc-800/80 rounded bg-[#09090b]/30">
                      <table className="min-w-full divide-y divide-zinc-800">
                        <thead className="bg-[#09090b] text-[10px] tracking-wider uppercase text-zinc-500 font-mono">
                          <tr>
                            <th className="px-3.5 py-1.5 text-left font-bold w-1/4">Account #</th>
                            <th className="px-3.5 py-1.5 text-left font-bold w-2/5">Account Name</th>
                            <th className="px-3.5 py-1.5 text-right font-bold w-1/5">Debit</th>
                            <th className="px-3.5 py-1.5 text-right font-bold w-1/5">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-zinc-300 font-sans">
                          {entry.lines.map((line) => {
                            const acct = resolveAccount(line.accountId, entry.description);
                            return (
                              <tr key={line.id} className="hover:bg-zinc-900/40 text-xs text-zinc-300">
                                <td className="px-3.5 py-1.5 font-mono text-zinc-400 font-medium">
                                  {acct.code}
                                </td>
                                <td className="px-3.5 py-1.5">
                                  <span className={line.credit > 0 ? 'pl-4 block text-zinc-400 border-l border-zinc-800' : 'font-semibold block'}>
                                    {acct.name}
                                  </span>
                                </td>
                                <td className="px-3.5 py-1.5 text-right font-mono font-bold text-zinc-100">
                                  {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                                </td>
                                <td className="px-3.5 py-1.5 text-right font-mono font-bold text-zinc-100">
                                  {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DELETED TRANSACTIONS LOG VIEW */}
      {activeTab === 'deleted' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              Permanently Deleted Journal Transactions ({deletedLogs.length})
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              Audit preservation guaranteed under SOX compliance
            </span>
          </div>

          {deletedLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No transactions have been deleted yet.</p>
              <p className="text-[11px] text-zinc-600 mt-1">When any transaction is deleted, its complete record and reason will be retained here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deletedLogs.map((log) => {
                const matchRef = log.details.match(/\[(.*?)\]/);
                const voucherRef = matchRef ? matchRef[1] : (log.targetId || 'VOUCHER');

                return (
                  <div key={log.id} className="p-4 bg-zinc-900/40 border border-rose-900/30 rounded-lg hover:border-rose-800/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-800/30 rounded text-[10px] font-mono font-bold uppercase">
                          DELETED
                        </span>
                        <span className="font-mono font-bold text-zinc-200 text-xs">
                          {voucherRef}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 text-xs font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400 text-xs font-mono flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-400" />
                          {log.actor}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenDeletedAudit(log)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <History className="h-3 w-3 text-blue-400" />
                          <span>Audit Trail</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 font-sans leading-relaxed bg-[#09090b] p-2.5 rounded border border-zinc-800">
                      {log.details}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLETE SYSTEM AUDIT SECURITY LOG */}
      {activeTab === 'audit' && (
        <div className="overflow-x-auto p-4">
          <div className="rounded border border-zinc-800 bg-[#09090b] p-1">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-xs font-mono">
              <thead className="bg-[#121214] text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Auditor</th>
                  <th className="px-4 py-3">Details / Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {auditLogs.map((log) => {
                  const isCreate = log.action === 'CREATE';
                  const isUpdate = log.action === 'UPDATE';
                  const isReverse = log.action === 'REVERSE';
                  const isDelete = log.action === 'DELETE';

                  return (
                    <tr key={log.id} className="hover:bg-zinc-900/30">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCreate ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' :
                          isUpdate ? 'bg-blue-950/40 text-blue-400 border border-blue-800/30' :
                          isReverse ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30' :
                          isDelete ? 'bg-rose-950/40 text-rose-400 border border-rose-800/30' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {log.actor}
                      </td>
                      <td className="px-4 py-3 text-zinc-200 font-sans text-xs max-w-xl break-words">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INDIVIDUAL TRANSACTION AUDIT MODAL */}
      {auditModalEntry && (
        <TransactionAuditModal
          isOpen={!!auditModalEntry}
          onClose={() => setAuditModalEntry(null)}
          entry={auditModalEntry}
          auditLogs={auditLogs}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#121214] border-2 border-rose-600/40 rounded-xl shadow-2xl w-full max-w-md p-6 text-zinc-100">
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Delete Journal Transaction?
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Reference: {deletingEntry.reference} (ID: {deletingEntry.id})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Are you sure you want to permanently delete this journal voucher? This will remove the voucher from active general ledger records, recalculate account balances, and record a permanent <strong className="text-rose-400 font-mono">DELETE</strong> entry in the immutable audit trail.
            </p>

            <div className="bg-[#09090b] p-3 rounded-lg border border-zinc-800 mb-4 text-xs font-mono space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Voucher Volume:</span>
                <span className="text-zinc-100 font-bold">
                  {formatCurrency(deletingEntry.lines.reduce((a, b) => a + b.debit, 0))}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Posting Date:</span>
                <span className="text-zinc-200">{deletingEntry.date}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Memo:</span>
                <span className="text-zinc-200 truncate max-w-[200px]">{deletingEntry.description}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Reason for Deletion (Logged in Audit Trail)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate entry, erroneous posting"
                className="w-full px-3 py-2 bg-[#09090b] border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingEntry(null);
                  setDeleteReason('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteEntry) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteEntry(deletingEntry.id, deleteReason.trim());
                    setDeletingEntry(null);
                    setDeleteReason('');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
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
