/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import ReportHeader from './ReportHeader';
import { formatGAAPCurrency, computeAccountBalances } from './reportUtils';

interface ChangesInEquityReportProps {
  company: CompanySettings | null;
  accounts: Account[];
  entries: JournalEntry[];
  startDate: string;
  endDate: string;
  accountingBasis: 'Accrual' | 'Cash';
  includeNotes: boolean;
  includeSignatures: boolean;
  onDrillDown?: (accountId?: string) => void;
}

export default function ChangesInEquityReport({
  company,
  accounts,
  entries,
  startDate,
  endDate,
  accountingBasis,
  includeNotes,
  includeSignatures,
  onDrillDown
}: ChangesInEquityReportProps) {
  const currencySymbol = company?.currencySymbol || '$';

  // Compute equity movements
  const equityData = useMemo(() => {
    // 1. Beginning balances prior to startDate
    const priorEntries = entries.filter(e => e.date < startDate && !e.isReversed);
    const priorBalances = computeAccountBalances(accounts, priorEntries);

    let beginningCommonStock = 0;
    let priorRevenue = 0;
    let priorExpense = 0;
    let priorDividends = 0;
    let priorStatedRetained = 0;

    accounts.forEach(acc => {
      const bal = priorBalances[acc.id]?.final || 0;
      if (acc.class === 'Equity') {
        if (acc.name.toLowerCase().includes('common') || acc.name.toLowerCase().includes('stock') || acc.id === '3010') {
          beginningCommonStock += bal;
        } else if (acc.name.toLowerCase().includes('retained') || acc.id === '3020') {
          priorStatedRetained += bal;
        } else if (acc.name.toLowerCase().includes('draw') || acc.name.toLowerCase().includes('dividend')) {
          priorDividends += bal;
        }
      } else if (acc.class === 'Revenue') {
        priorRevenue += bal;
      } else if (acc.class === 'Expense') {
        priorExpense += bal;
      }
    });

    const beginningRetainedEarnings = priorStatedRetained + (priorRevenue - priorExpense) - priorDividends;
    const beginningTotalEquity = beginningCommonStock + beginningRetainedEarnings;

    // 2. Period activity (between startDate and endDate)
    const periodEntries = entries.filter(e => e.date >= startDate && e.date <= endDate && !e.isReversed);

    let commonStockIssued = 0;
    let periodRevenue = 0;
    let periodExpenses = 0;
    let dividendsPaid = 0;

    periodEntries.forEach(entry => {
      entry.lines.forEach(line => {
        const acc = accounts.find(a => a.id === line.accountId);
        if (!acc) return;

        if (acc.class === 'Equity') {
          if (acc.name.toLowerCase().includes('common') || acc.name.toLowerCase().includes('stock') || acc.id === '3010') {
            commonStockIssued += (line.credit - line.debit);
          } else if (acc.name.toLowerCase().includes('draw') || acc.name.toLowerCase().includes('dividend')) {
            dividendsPaid += (line.debit - line.credit);
          }
        } else if (acc.class === 'Revenue') {
          periodRevenue += (line.credit - line.debit);
        } else if (acc.class === 'Expense') {
          periodExpenses += (line.debit - line.credit);
        }
      });
    });

    const netIncome = periodRevenue - periodExpenses;
    const endingCommonStock = beginningCommonStock + commonStockIssued;
    const endingRetainedEarnings = beginningRetainedEarnings + netIncome - dividendsPaid;
    const endingTotalEquity = endingCommonStock + endingRetainedEarnings;

    return {
      beginningCommonStock,
      beginningRetainedEarnings,
      beginningTotalEquity,
      commonStockIssued,
      netIncome,
      dividendsPaid,
      endingCommonStock,
      endingRetainedEarnings,
      endingTotalEquity
    };
  }, [accounts, entries, startDate, endDate]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 print:shadow-none print:border-none">
      
      {/* 3-Line GAAP Header with Company Name */}
      <ReportHeader
        company={company}
        reportTitle="Statement of Stockholders' Equity"
        reportSubtitle="Statement of Changes in Equity & Capital Reserves"
        dateType="period"
        startDate={startDate}
        endDate={endDate}
        accountingBasis={accountingBasis}
        currencyCode={company?.currency || 'USD'}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
        
        {/* Equity Matrix Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-900 text-slate-700 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 font-semibold">Equity Movement Category</th>
                <th className="py-3 px-3 font-semibold text-right">Common Stock</th>
                <th className="py-3 px-3 font-semibold text-right">Retained Earnings</th>
                <th className="py-3 px-3 font-semibold text-right">Total Equity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Beginning Balance */}
              <tr className="font-semibold text-slate-900 bg-slate-50">
                <td className="py-2.5 px-3">
                  Balance at Beginning of Period ({startDate})
                </td>
                <td className="py-2.5 px-3 font-mono text-right">
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('stock') || a.id === '3000')?.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.beginningCommonStock, currencySymbol)}
                  </button>
                </td>
                <td className="py-2.5 px-3 font-mono text-right">
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('retained') || a.id === '3010')?.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.beginningRetainedEarnings, currencySymbol)}
                  </button>
                </td>
                <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.class === 'Equity')?.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.beginningTotalEquity, currencySymbol)}
                  </button>
                </td>
              </tr>

              {/* Capital Contribution / Stock Issuance */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 text-slate-800">
                  Common Stock Issued &amp; Capital Contributions
                </td>
                <td className="py-2.5 px-3 font-mono text-right text-slate-800 font-medium">
                  {equityData.commonStockIssued !== 0 ? (
                    <button
                      onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('stock') || a.id === '3000')?.id)}
                      className="hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {formatGAAPCurrency(equityData.commonStockIssued, currencySymbol)}
                    </button>
                  ) : '—'}
                </td>
                <td className="py-2.5 px-3 font-mono text-right text-slate-400">—</td>
                <td className="py-2.5 px-3 font-mono text-right text-slate-800 font-medium">
                  {equityData.commonStockIssued !== 0 ? (
                    <button
                      onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('stock') || a.id === '3000')?.id)}
                      className="hover:text-blue-600 hover:underline cursor-pointer"
                    >
                      {formatGAAPCurrency(equityData.commonStockIssued, currencySymbol)}
                    </button>
                  ) : '—'}
                </td>
              </tr>

              {/* Net Operating Income */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 text-slate-800">
                  Net Operating Income (Loss) for the Period
                </td>
                <td className="py-2.5 px-3 font-mono text-right text-slate-400">—</td>
                <td className={`py-2.5 px-3 font-mono text-right font-semibold ${equityData.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('retained') || a.id === '3010')?.id)}
                    className="hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.netIncome, currencySymbol)}
                  </button>
                </td>
                <td className={`py-2.5 px-3 font-mono text-right font-semibold ${equityData.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.class === 'Equity')?.id)}
                    className="hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.netIncome, currencySymbol)}
                  </button>
                </td>
              </tr>

              {/* Dividends / Distributions */}
              {equityData.dividendsPaid > 0 && (
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-800">
                    Dividends &amp; Stockholder Distributions
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 font-mono text-right text-rose-700 font-medium">
                    <button
                      onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('draw') || a.name.toLowerCase().includes('distribution'))?.id)}
                      className="hover:underline cursor-pointer"
                    >
                      ({formatGAAPCurrency(equityData.dividendsPaid, currencySymbol)})
                    </button>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-rose-700 font-medium">
                    <button
                      onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('draw') || a.name.toLowerCase().includes('distribution'))?.id)}
                      className="hover:underline cursor-pointer"
                    >
                      ({formatGAAPCurrency(equityData.dividendsPaid, currencySymbol)})
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              {/* Ending Balance */}
              <tr className="border-t-2 border-slate-900 font-bold text-xs uppercase bg-slate-100 text-slate-900">
                <td className="py-3 px-3">
                  Balance at Ending of Period ({endDate})
                </td>
                <td className="py-3 px-3 font-mono text-right">
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('stock') || a.id === '3000')?.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.endingCommonStock, currencySymbol)}
                  </button>
                </td>
                <td className="py-3 px-3 font-mono text-right">
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('retained') || a.id === '3010')?.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.endingRetainedEarnings, currencySymbol)}
                  </button>
                </td>
                <td className="py-3 px-3 font-mono text-right underline decoration-double decoration-2 text-sm font-bold text-slate-900">
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.class === 'Equity')?.id)}
                    className="hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(equityData.endingTotalEquity, currencySymbol)}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footnotes */}
        {includeNotes && (
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-1.5 font-sans">
            <h5 className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
              Notes on Changes in Stockholders' Equity (US GAAP ASC 505)
            </h5>
            <p className="leading-relaxed">
              Common stock reflects total issued and outstanding voting equity capital. Retained earnings represent the cumulative undistributed earnings of the corporation since inception, increased by current period net operating income and reduced by any declared distributions or shareholder draws.
            </p>
          </div>
        )}

        {/* Signatures */}
        {includeSignatures && (
          <div className="border-t border-slate-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Corporate Secretary / Treasurer</p>
              <p className="text-[10px] text-slate-500">{company?.name || 'Finex Global Enterprises Inc.'}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">External Auditor Sign-off</p>
              <p className="text-[10px] text-slate-500">Board Governance Review</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
