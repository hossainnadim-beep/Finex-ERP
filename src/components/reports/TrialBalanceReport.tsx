/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import ReportHeader from './ReportHeader';
import { formatGAAPCurrency, computeAccountBalances } from './reportUtils';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface TrialBalanceReportProps {
  company: CompanySettings | null;
  accounts: Account[];
  entries: JournalEntry[];
  asOfDate: string;
  accountingBasis: 'Accrual' | 'Cash';
  includeNotes: boolean;
  includeSignatures: boolean;
  collapseZeroBalances: boolean;
  onDrillDown?: (accountId?: string) => void;
}

export default function TrialBalanceReport({
  company,
  accounts,
  entries,
  asOfDate,
  accountingBasis,
  includeNotes,
  includeSignatures,
  collapseZeroBalances,
  onDrillDown
}: TrialBalanceReportProps) {
  const currencySymbol = company?.currencySymbol || '$';

  // Filter entries up to the as-of date
  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.date <= asOfDate && !e.isReversed);
  }, [entries, asOfDate]);

  const balances = useMemo(() => {
    return computeAccountBalances(accounts, filteredEntries);
  }, [accounts, filteredEntries]);

  // Build rows for each account
  const trialBalanceRows = useMemo(() => {
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    const rows = accounts.map(acc => {
      const b = balances[acc.id] || { debits: 0, credits: 0, netDebit: 0, final: 0 };
      
      // Net debit: if > 0, sits in Debit column. If < 0, sits in Credit column.
      let debitCents = 0;
      let creditCents = 0;

      if (b.netDebit > 0) {
        debitCents = b.netDebit;
      } else if (b.netDebit < 0) {
        creditCents = Math.abs(b.netDebit);
      }

      totalDebitCents += debitCents;
      totalCreditCents += creditCents;

      return {
        account: acc,
        debitCents,
        creditCents,
        hasActivity: debitCents > 0 || creditCents > 0
      };
    });

    const isBalanced = totalDebitCents === totalCreditCents;
    const difference = Math.abs(totalDebitCents - totalCreditCents);

    return {
      rows,
      totalDebitCents,
      totalCreditCents,
      isBalanced,
      difference
    };
  }, [accounts, balances]);

  const displayedRows = collapseZeroBalances
    ? trialBalanceRows.rows.filter(r => r.hasActivity)
    : trialBalanceRows.rows;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 print:shadow-none print:border-none">
      
      {/* 3-Line GAAP Header with Company Name */}
      <ReportHeader
        company={company}
        reportTitle="Trial Balance"
        reportSubtitle="General Ledger Debit & Credit Equivalence Verification"
        dateType="as_of"
        asOfDate={asOfDate}
        accountingBasis={accountingBasis}
        currencyCode={company?.currency || 'USD'}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 sm:p-8 space-y-6">
        
        {/* Verification Alert Banner */}
        <div className={`p-4 rounded-lg border text-xs flex items-center justify-between gap-4 ${
          trialBalanceRows.isBalanced
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {trialBalanceRows.isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            )}
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block">
                {trialBalanceRows.isBalanced ? 'Trial Balance Verified & Balanced' : 'Trial Balance Out-of-Balance Warning'}
              </span>
              <p className="text-[11px] mt-0.5 font-medium opacity-90">
                {trialBalanceRows.isBalanced
                  ? `Total Debits (${formatGAAPCurrency(trialBalanceRows.totalDebitCents, currencySymbol)}) exactly equal Total Credits (${formatGAAPCurrency(trialBalanceRows.totalCreditCents, currencySymbol)}).`
                  : `Discrepancy detected: ${formatGAAPCurrency(trialBalanceRows.difference, currencySymbol)}. debits ≠ credits.`
                }
              </p>
            </div>
          </div>
          <span className={`font-mono font-bold text-xs shrink-0 px-2.5 py-1 rounded border ${
            trialBalanceRows.isBalanced 
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            Debits = Credits
          </span>
        </div>

        {/* Trial Balance Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-900 text-slate-700 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 font-semibold">Account Code</th>
                <th className="py-2.5 px-3 font-semibold">Account Name</th>
                <th className="py-2.5 px-3 font-semibold">Class</th>
                <th className="py-2.5 px-3 font-semibold text-right">Debit Balance</th>
                <th className="py-2.5 px-3 font-semibold text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedRows.map(({ account, debitCents, creditCents }) => (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 font-mono text-slate-500 font-semibold">
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="hover:text-blue-600 hover:underline cursor-pointer"
                      title={`Click to view transaction breakdown for ${account.name}`}
                    >
                      #{account.id}
                    </button>
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="hover:text-blue-600 hover:underline cursor-pointer text-left font-medium text-slate-900"
                      title={`Click to view transaction breakdown for ${account.name}`}
                    >
                      {account.name}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 font-medium">
                      {account.class}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-900 font-medium">
                    {debitCents > 0 ? (
                      <button
                        onClick={() => onDrillDown?.(account.id)}
                        className="hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                        title={`Click to drill down into debit transactions for ${account.name}`}
                      >
                        {formatGAAPCurrency(debitCents, currencySymbol)}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-900 font-medium">
                    {creditCents > 0 ? (
                      <button
                        onClick={() => onDrillDown?.(account.id)}
                        className="hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                        title={`Click to drill down into credit transactions for ${account.name}`}
                      >
                        {formatGAAPCurrency(creditCents, currencySymbol)}
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-bold text-xs uppercase bg-slate-100">
                <td colSpan={3} className="py-3 px-3 text-slate-900">
                  Total Trial Balance
                </td>
                <td className="py-3 px-3 font-mono text-right text-slate-900 underline decoration-double decoration-2 text-sm font-bold">
                  <button
                    onClick={() => onDrillDown?.(displayedRows[0]?.account.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                    title="Click to view transactions"
                  >
                    {formatGAAPCurrency(trialBalanceRows.totalDebitCents, currencySymbol)}
                  </button>
                </td>
                <td className="py-3 px-3 font-mono text-right text-slate-900 underline decoration-double decoration-2 text-sm font-bold">
                  <button
                    onClick={() => onDrillDown?.(displayedRows[0]?.account.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                    title="Click to view transactions"
                  >
                    {formatGAAPCurrency(trialBalanceRows.totalCreditCents, currencySymbol)}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {includeNotes && (
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-1.5 font-sans">
            <h5 className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
              Trial Balance Audit Notes
            </h5>
            <p className="leading-relaxed">
              This trial balance reports all general ledger accounts reflecting cumulative transactions up to {asOfDate}. The debit and credit totals confirm arithmetical accuracy of the double-entry accounting records.
            </p>
          </div>
        )}

        {includeSignatures && (
          <div className="border-t border-slate-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Lead Accountant</p>
              <p className="text-[10px] text-slate-500">{company?.name || 'Finex Global Enterprises Inc.'}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Audit &amp; Compliance Reviewer</p>
              <p className="text-[10px] text-slate-500">Quality Assurance Committee</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
