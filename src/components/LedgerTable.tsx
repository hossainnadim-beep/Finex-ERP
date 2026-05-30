/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { JournalEntry, Account } from '../types';
import { Undo2, Eye, EyeOff, Search, Receipt, Calendar, ArrowUpRight, Scale, ShieldAlert, History } from 'lucide-react';

interface LedgerTableProps {
  entries: JournalEntry[];
  onReverseEntry: (originalEntryId: string) => void;
  auditLogs: any[];
  accounts: Account[];
}

export default function LedgerTable({ entries, onReverseEntry, auditLogs, accounts }: LedgerTableProps) {
  const [showReversed, setShowReversed] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'audit'>('transactions');

  const getAccountName = (id: string): string => {
    return accounts.find(a => a.id === id)?.name || `Acct #${id}`;
  };

  const getAccountClass = (id: string): string => {
    return accounts.find(a => a.id === id)?.class || '';
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Filter based on showReversed toggle & term
  const filteredEntries = entries.filter(entry => {
    // Audit trial soft delete rule: show/hide reversed entries
    if (!showReversed && (entry.isReversed || entry.reversingForId !== null)) {
      return false;
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchRef = entry.reference.toLowerCase().includes(term);
      const matchDesc = entry.description.toLowerCase().includes(term);
      const matchAcctName = entry.lines.some(l => getAccountName(l.accountId).toLowerCase().includes(term));
      const matchAcctId = entry.lines.some(l => l.accountId.includes(term));
      return matchRef || matchDesc || matchAcctName || matchAcctId;
    }

    return true;
  });

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

          <div className="flex rounded bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === 'transactions' 
                  ? 'bg-zinc-800 text-blue-400 border border-zinc-700/55 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-205 border border-transparent'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> Journal Entries
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                activeTab === 'audit' 
                  ? 'bg-zinc-800 text-blue-400 border border-zinc-700/55 shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-205 border border-transparent'
              }`}
            >
              <History className="h-3.5 w-3.5" /> Audit Security Log ({auditLogs.length})
            </button>
          </div>
        </div>

        {activeTab === 'transactions' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-zinc-850">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Reference, Account, Description..."
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-550 focus:outline-none focus:border-blue-500 transition-colors text-xs"
              />
            </div>

            {/* Audit Trail Toggles */}
            <button
              type="button"
              onClick={() => setShowReversed(!showReversed)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs font-semibold transition-colors cursor-pointer ${
                showReversed 
                  ? 'bg-blue-950/20 text-blue-400 border-blue-800/40 hover:bg-blue-950/30' 
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-300'
              }`}
              id="toggle-reversed-entries"
            >
              {showReversed ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Showing Reversed Drafts (Audit Trail Mode)</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Hiding Reversed Entries (Active only)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'transactions' ? (
        <div className="overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <ShieldAlert className="h-8 w-8 mx-auto mb-3 text-zinc-650" />
              <p className="text-xs font-semibold text-zinc-400">No journal entries logged.</p>
              <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider font-mono">Try modifying your search query</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-850 font-sans">
              {filteredEntries.map((entry) => {
                const totalVal = entry.lines.reduce((acc, curr) => acc + curr.debit, 0);
                
                return (
                  <div 
                    key={entry.id} 
                    className={`p-5 transition-all ${
                      entry.isReversed 
                        ? 'bg-amber-950/5 border-l-4 border-amber-600/60' 
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
                        <span className="font-semibold text-zinc-300">
                          Ref: <span className="font-mono text-blue-450 font-bold">{entry.reference}</span>
                        </span>
                        <span className="text-zinc-700">|</span>
                        <span className="text-zinc-500 font-mono text-[11px]">Auditor Checksum: {entry.createdBy}</span>
                      </div>

                      {/* Controls and Badges */}
                      <div className="flex items-center gap-2 leading-none">
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
                        
                        {/* Immutability compliance: Never allow direct deletion of entries! */}
                        {!entry.isReversed && !entry.reversingForId && (
                          <button
                            onClick={() => onReverseEntry(entry.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-550/20 hover:border-amber-500 text-amber-400 text-[10px] font-bold rounded uppercase font-mono transition-colors whitespace-nowrap cursor-pointer active:scale-97"
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>Post Ledger Reversal</span>
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
                      <table className="min-w-full divide-y divide-zinc-850">
                        <thead className="bg-[#09090b] text-[10px] tracking-wider uppercase text-zinc-500 font-mono">
                          <tr>
                            <th className="px-3.5 py-1.5 text-left font-bold w-1/4">Account #</th>
                            <th className="px-3.5 py-1.5 text-left font-bold w-2/5">Account Name</th>
                            <th className="px-3.5 py-1.5 text-right font-bold w-1/5">Debit</th>
                            <th className="px-3.5 py-1.5 text-right font-bold w-1/5">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850 text-zinc-300 font-sans">
                          {entry.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-zinc-900/40 text-xs text-zinc-300">
                              <td className="px-3.5 py-1.5 font-mono text-zinc-500">
                                {line.accountId}
                              </td>
                              <td className="px-3.5 py-1.5">
                                <span className={line.credit > 0 ? 'pl-4 block text-zinc-450 border-l border-zinc-800' : 'font-semibold block'}>
                                  {getAccountName(line.accountId)}
                                </span>
                              </td>
                              <td className="px-3.5 py-1.5 text-right font-mono text-zinc-200">
                                {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                              </td>
                              <td className="px-3.5 py-1.5 text-right font-mono text-zinc-200">
                                {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail system security events logs */
        <div className="overflow-x-auto p-4">
          <div className="rounded border border-zinc-800 bg-[#09090b] p-1">
            <table className="min-w-full divide-y divide-zinc-850">
              <thead className="bg-[#09090b] text-[10px] text-zinc-500 tracking-wider uppercase font-mono">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold">Security Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-bold">Action Event</th>
                  <th className="px-4 py-2.5 text-left font-bold">Auditor ID</th>
                  <th className="px-4 py-2.5 text-left font-bold">Activity Details Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300 text-xs text-left">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold leading-none ${
                        log.action.includes('CREATE') ? 'bg-emerald-950/30 text-emerald-400' :
                        log.action.includes('REVERSE') ? 'bg-amber-950/30 text-amber-400' :
                        log.action.includes('AUTH_SIGN_IN') ? 'bg-blue-950/30 text-blue-450' :
                        log.action.includes('AUTH_SIGN_UP') ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' :
                        'bg-rose-950/30 text-rose-450'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 font-sans text-[11px]">
                      {log.actor}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-200 font-sans text-xs">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
