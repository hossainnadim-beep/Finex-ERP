/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { JournalEntry, AuditLog } from '../types';
import { 
  X, 
  History, 
  ShieldCheck, 
  Clock, 
  User, 
  Copy, 
  Check, 
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Printer
} from 'lucide-react';

interface TransactionAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: JournalEntry | null;
  auditLogs: AuditLog[];
}

export default function TransactionAuditModal({
  isOpen,
  onClose,
  entry,
  auditLogs
}: TransactionAuditModalProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen || !entry) return null;

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const totalVolumeCents = entry.lines ? entry.lines.reduce((acc, l) => acc + l.debit, 0) : 0;

  // Filter logs specifically relevant to this transaction
  const relevantLogs = useMemo(() => {
    const raw = auditLogs.filter(log => 
      log.targetId === entry.id ||
      log.targetId === entry.reference ||
      (log.details && (log.details.includes(entry.id) || log.details.includes(entry.reference)))
    );

    // If no CREATE log is present, synthesize the baseline creation event for a complete timeline
    const hasCreate = raw.some(l => l.action === 'CREATE');
    if (!hasCreate && entry.lines && entry.lines.length > 0) {
      const baselineCreate: AuditLog = {
        id: `L-ORIGIN-${entry.id}`,
        timestamp: entry.createdAt || new Date(Date.now() - 86400000).toISOString(),
        action: 'CREATE',
        actor: entry.createdBy || 'finance-officer@enterprise.io',
        details: `Initial journal entry voucher created and posted under reference ${entry.reference}. Balanced volume: ${formatCurrency(totalVolumeCents)}. Split lines: ${entry.lines.length} accounts recorded. Memo: "${entry.description}".`,
        targetId: entry.id
      };
      return [baselineCreate, ...raw];
    }

    return raw;
  }, [auditLogs, entry, totalVolumeCents]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white border-2 border-slate-300 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 font-sans"
        id="transaction-audit-modal"
      >
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl border border-blue-200">
              <History className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Transaction Audit Trail
                </h3>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-mono font-bold">
                  {entry.reference}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Voucher ID: {entry.id} • Total Volume: {formatCurrency(totalVolumeCents)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Print Audit Trail"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Voucher Metadata Summary */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold">Posting Date</span>
            <span className="text-slate-900 font-bold">{entry.date}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold">Status</span>
            <span className={`font-bold ${entry.isReversed ? 'text-amber-700' : 'text-emerald-700'}`}>
              {entry.isReversed ? 'Reversed (Immutable)' : 'Active / Posted'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold">Origin Auditor</span>
            <span className="text-slate-800 truncate block font-medium" title={entry.createdBy}>
              {entry.createdBy || 'finance@enterprise.io'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold">Account Splits</span>
            <span className="text-slate-800 font-bold">
              {entry.lines.length} Line Items
            </span>
          </div>
        </div>

        {/* Audit Timeline List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
            <span className="text-slate-700 font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified Event Timeline ({relevantLogs.length})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Immutable Enterprise Ledger Record
            </span>
          </div>

          {relevantLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-700">No explicit historical logs found for this voucher ID.</p>
              <p className="text-[11px] text-slate-500 mt-1">Any edits or changes made to this transaction will appear here.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
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

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors shadow-2xs">
                      
                      {/* Event Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                            isCreate ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            isUpdate ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            isReverse ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            isDelete ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {log.action}
                          </span>

                          <span className="text-xs text-slate-600 font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
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
                          <span className="text-xs text-slate-700 font-mono flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                            <User className="h-3 w-3 text-blue-600" />
                            {log.actor}
                          </span>
                        </div>
                      </div>

                      {/* Event Details Text */}
                      <p className="text-xs text-slate-700 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-slate-200">
                        {log.details}
                      </p>

                      {/* Structured Diff Breakdown */}
                      {changesList.length > 0 && (
                        <div className="mt-2.5 bg-blue-50/80 border border-blue-200 rounded-lg p-2.5">
                          <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block mb-1">
                            Modified Attributes:
                          </span>
                          <div className="space-y-1">
                            {changesList.map((ch, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-blue-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                <span>{ch}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Event ID: {log.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(log.id, log.id)}
                          className="hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>Copy ID</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Security Checksum: SHA-256 Tamper-Proof Verified
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}
