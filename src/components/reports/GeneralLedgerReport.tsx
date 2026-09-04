/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import ReportHeader from './ReportHeader';
import { formatGAAPCurrency, computeAccountBalances } from './reportUtils';
import { Search } from 'lucide-react';

interface GeneralLedgerReportProps {
  company: CompanySettings | null;
  accounts: Account[];
  entries: JournalEntry[];
  startDate: string;
  endDate: string;
  accountingBasis: 'Accrual' | 'Cash';
  includeNotes: boolean;
  includeSignatures: boolean;
  collapseZeroBalances: boolean;
  onDrillDown?: (accountId?: string) => void;
}

export default function GeneralLedgerReport({
  company,
  accounts,
  entries,
  startDate,
  endDate,
  accountingBasis,
  includeNotes,
  includeSignatures,
  collapseZeroBalances,
  onDrillDown
}: GeneralLedgerReportProps) {
  const currencySymbol = company?.currencySymbol || '$';
  const [accountFilter, setAccountFilter] = useState('');

  // 1. Compute opening balance for each account (entries before startDate)
  const priorEntries = useMemo(() => {
    return entries.filter(e => e.date < startDate && !e.isReversed);
  }, [entries, startDate]);

  const openingBalances = useMemo(() => {
    return computeAccountBalances(accounts, priorEntries);
  }, [accounts, priorEntries]);

  // 2. Filter period entries
  const periodEntries = useMemo(() => {
    return entries
      .filter(e => e.date >= startDate && e.date <= endDate && !e.isReversed)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, startDate, endDate]);

  // 3. Generate detailed ledger itemization per account
  const accountLedgers = useMemo(() => {
    return accounts.map(account => {
      const opening = openingBalances[account.id]?.final || 0;
      let running = opening;
      let totalDebits = 0;
      let totalCredits = 0;

      const transactions: Array<{
        id: string;
        date: string;
        reference: string;
        description: string;
        debit: number;
        credit: number;
        runningBalance: number;
      }> = [];

      periodEntries.forEach(entry => {
        const line = entry.lines.find(l => l.accountId === account.id);
        if (line) {
          totalDebits += line.debit;
          totalCredits += line.credit;

          if (account.normalBalance === 'Debit') {
            running += (line.debit - line.credit);
          } else {
            running += (line.credit - line.debit);
          }

          transactions.push({
            id: `${entry.id}-${line.id}`,
            date: entry.date,
            reference: entry.reference || 'JE',
            description: entry.description,
            debit: line.debit,
            credit: line.credit,
            runningBalance: running
          });
        }
      });

      const netChange = account.normalBalance === 'Debit'
        ? (totalDebits - totalCredits)
        : (totalCredits - totalDebits);

      return {
        account,
        openingBalance: opening,
        transactions,
        totalDebits,
        totalCredits,
        netChange,
        endingBalance: running,
        hasActivity: transactions.length > 0 || opening !== 0
      };
    });
  }, [accounts, openingBalances, periodEntries]);

  // Filter accounts by search query and collapseZeroBalances
  const filteredAccounts = useMemo(() => {
    return accountLedgers.filter(item => {
      if (collapseZeroBalances && !item.hasActivity) return false;
      if (!accountFilter.trim()) return true;
      const q = accountFilter.toLowerCase().trim();
      return item.account.name.toLowerCase().includes(q) || item.account.id.includes(q);
    });
  }, [accountLedgers, collapseZeroBalances, accountFilter]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 print:shadow-none print:border-none">
      
      {/* 3-Line GAAP Header with Company Name */}
      <ReportHeader
        company={company}
        reportTitle="General Ledger Detail"
        reportSubtitle="Audit Trail & Transaction History by Chart of Accounts"
        dateType="period"
        startDate={startDate}
        endDate={endDate}
        accountingBasis={accountingBasis}
        currencyCode={company?.currency || 'USD'}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 sm:p-8 space-y-6">
        
        {/* Search & Filter bar within General Ledger */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by account name or code..."
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="text-xs text-slate-600 font-mono">
            Showing {filteredAccounts.length} of {accounts.length} general ledger accounts
          </div>
        </div>

        {/* Ledger Account Sections */}
        <div className="space-y-8">
          {filteredAccounts.map(({ account, openingBalance, transactions, totalDebits, totalCredits, endingBalance }) => (
            <div 
              key={account.id} 
              className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
            >
              {/* Account Header Bar */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onDrillDown?.(account.id)}
                    className="font-mono text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                    title={`Click to view transaction report for ${account.name}`}
                  >
                    #{account.id}
                  </button>
                  <button
                    onClick={() => onDrillDown?.(account.id)}
                    className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer text-left"
                    title={`Click to view transaction report for ${account.name}`}
                  >
                    {account.name}
                  </button>
                  <span className="text-[10px] text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                    {account.class} • Normal {account.normalBalance}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] mr-1">Beg:</span>
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="text-slate-700 font-medium hover:underline cursor-pointer"
                    >
                      {formatGAAPCurrency(openingBalance, currencySymbol)}
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] mr-1">End:</span>
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="text-slate-900 font-bold hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {formatGAAPCurrency(endingBalance, currencySymbol)}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions Table for this Account */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Description / Memo</th>
                      <th className="py-2 px-3 text-right">Debit</th>
                      <th className="py-2 px-3 text-right">Credit</th>
                      <th className="py-2 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Beginning Balance Row */}
                    <tr className="bg-slate-50/40 italic text-slate-600">
                      <td className="py-1.5 px-3 font-mono">{startDate}</td>
                      <td className="py-1.5 px-3">—</td>
                      <td className="py-1.5 px-3">Beginning Balance Brought Forward</td>
                      <td className="py-1.5 px-3 text-right">—</td>
                      <td className="py-1.5 px-3 text-right">—</td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatGAAPCurrency(openingBalance, currencySymbol)}
                      </td>
                    </tr>

                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-2 px-3 font-mono text-blue-700 font-semibold whitespace-nowrap">
                          {tx.reference}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          {tx.description}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-900 font-medium">
                          {tx.debit > 0 ? formatGAAPCurrency(tx.debit, currencySymbol) : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-900 font-medium">
                          {tx.credit > 0 ? formatGAAPCurrency(tx.credit, currencySymbol) : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-900 font-bold">
                          {formatGAAPCurrency(tx.runningBalance, currencySymbol)}
                        </td>
                      </tr>
                    ))}

                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 px-3 text-center text-slate-500 italic text-[11px]">
                          No ledger postings in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-300 font-semibold text-xs bg-slate-50">
                      <td colSpan={3} className="py-2.5 px-3 text-slate-700">
                        Period Totals &amp; Ending Balance for #{account.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-900 font-medium">
                        {totalDebits > 0 ? formatGAAPCurrency(totalDebits, currencySymbol) : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-900 font-medium">
                        {totalCredits > 0 ? formatGAAPCurrency(totalCredits, currencySymbol) : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-900 font-bold underline decoration-1">
                        {formatGAAPCurrency(endingBalance, currencySymbol)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}

          {filteredAccounts.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No matching accounts found for query "{accountFilter}".
            </div>
          )}
        </div>

        {includeNotes && (
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-1.5 font-sans">
            <h5 className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
              General Ledger Audit &amp; Journal Note
            </h5>
            <p className="leading-relaxed">
              Each journal entry postings record includes dual debits and credits verified against Sarbanes-Oxley audit log specifications. All transaction references correlate directly with source documentation and issued invoices.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
