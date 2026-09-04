/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import ReportHeader from './ReportHeader';
import { formatGAAPCurrency } from './reportUtils';

interface IncomeStatementReportProps {
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

export default function IncomeStatementReport({
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
}: IncomeStatementReportProps) {
  const currencySymbol = company?.currencySymbol || '$';

  // Filter journal entries for the specific period
  const periodEntries = useMemo(() => {
    return entries.filter(e => e.date >= startDate && e.date <= endDate && !e.isReversed);
  }, [entries, startDate, endDate]);

  // Compute revenues and expenses within the period
  const pnlData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    const cogsMap: Record<string, number> = {};
    const opexMap: Record<string, number> = {};
    const otherExpenseMap: Record<string, number> = {};

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOpex = 0;
    let totalOtherExpense = 0;

    periodEntries.forEach(entry => {
      entry.lines.forEach(line => {
        const account = accounts.find(a => a.id === line.accountId);
        if (!account) return;

        if (account.class === 'Revenue') {
          // Normal balance: Credit
          const net = line.credit - line.debit;
          revenueMap[account.id] = (revenueMap[account.id] || 0) + net;
          totalRevenue += net;
        } else if (account.class === 'Expense') {
          // Normal balance: Debit
          const net = line.debit - line.credit;
          const lowerName = account.name.toLowerCase();

          if (lowerName.includes('cost of goods') || lowerName.includes('cogs') || lowerName.includes('cost of sales') || lowerName.includes('direct cost')) {
            cogsMap[account.id] = (cogsMap[account.id] || 0) + net;
            totalCogs += net;
          } else if (lowerName.includes('income tax') || lowerName.includes('interest expense')) {
            otherExpenseMap[account.id] = (otherExpenseMap[account.id] || 0) + net;
            totalOtherExpense += net;
          } else {
            opexMap[account.id] = (opexMap[account.id] || 0) + net;
            totalOpex += net;
          }
        }
      });
    });

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const operatingIncome = grossProfit - totalOpex;
    const operatingMargin = totalRevenue !== 0 ? (operatingIncome / totalRevenue) * 100 : 0;
    const netIncome = operatingIncome - totalOtherExpense;
    const netProfitMargin = totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0;

    return {
      revenueMap,
      cogsMap,
      opexMap,
      otherExpenseMap,
      totalRevenue,
      totalCogs,
      grossProfit,
      grossMargin,
      totalOpex,
      operatingIncome,
      operatingMargin,
      totalOtherExpense,
      netIncome,
      netProfitMargin
    };
  }, [accounts, periodEntries]);

  const revenueAccounts = accounts.filter(a => a.class === 'Revenue');
  const cogsAccounts = accounts.filter(a => a.class === 'Expense' && (a.name.toLowerCase().includes('cost of') || a.name.toLowerCase().includes('cogs')));
  const operatingExpenseAccounts = accounts.filter(a => a.class === 'Expense' && !cogsAccounts.includes(a) && !a.name.toLowerCase().includes('tax') && !a.name.toLowerCase().includes('interest'));
  const otherAccounts = accounts.filter(a => a.class === 'Expense' && (a.name.toLowerCase().includes('tax') || a.name.toLowerCase().includes('interest')));

  const filterZero = (list: Account[], map: Record<string, number>) => {
    if (!collapseZeroBalances) return list;
    return list.filter(a => (map[a.id] || 0) !== 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 print:shadow-none print:border-none">
      
      {/* 3-Line GAAP Header with Company Name */}
      <ReportHeader
        company={company}
        reportTitle="Income Statement"
        reportSubtitle="Statement of Operations / Profit & Loss"
        dateType="period"
        startDate={startDate}
        endDate={endDate}
        accountingBasis={accountingBasis}
        currencyCode={company?.currency || 'USD'}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-4xl mx-auto">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <span className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold">Total Revenue</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatGAAPCurrency(pnlData.totalRevenue, currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Gross operating turnover</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <span className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold">Operating Margin</span>
            <div className="text-xl font-bold font-mono text-blue-700 mt-1">
              {pnlData.operatingMargin.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Operating income ratio</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <span className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold">Net Income (Profit)</span>
            <div className={`text-xl font-bold font-mono mt-1 ${pnlData.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatGAAPCurrency(pnlData.netIncome, currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{pnlData.netProfitMargin.toFixed(1)}% margin</span>
          </div>
        </div>

        {/* Operating Statement Breakdown Table */}
        <div className="space-y-6">
          
          {/* 1. REVENUE */}
          <div className="space-y-2">
            <div className="border-b-2 border-slate-900 pb-1.5 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-serif">
                Revenues &amp; Operating Sales
              </h3>
              <span className="text-[11px] text-slate-600 font-mono font-medium">Amount</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filterZero(revenueAccounts, pnlData.revenueMap).map(account => (
                <div key={account.id} className="flex justify-between items-center py-2 text-xs hover:bg-slate-50 px-1 transition-colors">
                  <div>
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="text-slate-900 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
                      title={`Click to view transaction breakdown for ${account.name}`}
                    >
                      {account.name}
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">#{account.id}</span>
                  </div>
                  <button
                    onClick={() => onDrillDown?.(account.id)}
                    className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                    title={`Click to drill down into transactions for ${account.name}`}
                  >
                    {formatGAAPCurrency(pnlData.revenueMap[account.id] || 0, currencySymbol)}
                  </button>
                </div>
              ))}
              {filterZero(revenueAccounts, pnlData.revenueMap).length === 0 && (
                <p className="text-xs text-slate-500 italic py-2">No revenue recorded for this period</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-bold text-slate-900">
              <span>Total Revenue</span>
              <button
                onClick={() => onDrillDown?.(revenueAccounts[0]?.id)}
                className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-bold"
                title="Click to view revenue breakdown"
              >
                {formatGAAPCurrency(pnlData.totalRevenue, currencySymbol)}
              </button>
            </div>
          </div>

          {/* 2. COST OF GOODS SOLD */}
          {cogsAccounts.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="border-b border-slate-300 pb-1 flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cost of Goods Sold (COGS)
                </h4>
              </div>

              <div className="divide-y divide-slate-200">
                {filterZero(cogsAccounts, pnlData.cogsMap).map(account => (
                  <div key={account.id} className="flex justify-between items-center py-2 text-xs hover:bg-slate-50 px-1 transition-colors">
                    <div>
                      <button
                        onClick={() => onDrillDown?.(account.id)}
                        className="text-slate-900 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
                        title={`Click to view transaction breakdown for ${account.name}`}
                      >
                        {account.name}
                      </button>
                      <span className="text-[10px] text-slate-500 font-mono ml-2">#{account.id}</span>
                    </div>
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                      title={`Click to drill down into transactions for ${account.name}`}
                    >
                      {formatGAAPCurrency(pnlData.cogsMap[account.id] || 0, currencySymbol)}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-semibold text-slate-800">
                <span>Total Cost of Goods Sold</span>
                <button
                  onClick={() => onDrillDown?.(cogsAccounts[0]?.id)}
                  className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                  title="Click to view COGS breakdown"
                >
                  {formatGAAPCurrency(pnlData.totalCogs, currencySymbol)}
                </button>
              </div>
            </div>
          )}

          {/* GROSS PROFIT ROW */}
          <div className="flex justify-between items-center py-3 px-3 bg-slate-100 border-t-2 border-slate-400 rounded text-xs font-bold text-slate-900">
            <div>
              <span>Gross Profit</span>
              <span className="text-[11px] text-slate-600 font-mono font-normal ml-2">({pnlData.grossMargin.toFixed(1)}% margin)</span>
            </div>
            <button
              onClick={() => onDrillDown?.(revenueAccounts[0]?.id)}
              className="font-mono text-slate-900 text-sm font-bold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
              title="Click to view transactions"
            >
              {formatGAAPCurrency(pnlData.grossProfit, currencySymbol)}
            </button>
          </div>

          {/* 3. OPERATING EXPENSES (SG&A) */}
          <div className="space-y-2 pt-2">
            <div className="border-b-2 border-slate-900 pb-1.5 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-serif">
                Operating Expenses (SG&amp;A)
              </h3>
            </div>

            <div className="divide-y divide-slate-200">
              {filterZero(operatingExpenseAccounts, pnlData.opexMap).map(account => (
                <div key={account.id} className="flex justify-between items-center py-2 text-xs hover:bg-slate-50 px-1 transition-colors">
                  <div>
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="text-slate-900 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
                      title={`Click to view transaction breakdown for ${account.name}`}
                    >
                      {account.name}
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">#{account.id}</span>
                  </div>
                  <button
                    onClick={() => onDrillDown?.(account.id)}
                    className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                    title={`Click to drill down into transactions for ${account.name}`}
                  >
                    {formatGAAPCurrency(pnlData.opexMap[account.id] || 0, currencySymbol)}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-bold text-slate-900">
              <span>Total Operating Expenses</span>
              <button
                onClick={() => onDrillDown?.(operatingExpenseAccounts[0]?.id)}
                className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-bold"
                title="Click to view operating expense breakdown"
              >
                {formatGAAPCurrency(pnlData.totalOpex, currencySymbol)}
              </button>
            </div>
          </div>

          {/* OPERATING INCOME (EBIT) */}
          <div className="flex justify-between items-center py-3 px-3 bg-slate-100 border-t-2 border-slate-400 rounded text-xs font-bold text-slate-900">
            <div>
              <span>Operating Income (EBIT)</span>
              <span className="text-[11px] text-slate-600 font-mono font-normal ml-2">({pnlData.operatingMargin.toFixed(1)}% margin)</span>
            </div>
            <button
              onClick={() => onDrillDown?.(operatingExpenseAccounts[0]?.id || revenueAccounts[0]?.id)}
              className={`font-mono text-sm font-bold hover:text-blue-600 hover:underline cursor-pointer transition-colors ${pnlData.operatingIncome >= 0 ? 'text-slate-900' : 'text-rose-700'}`}
              title="Click to view operating transactions"
            >
              {formatGAAPCurrency(pnlData.operatingIncome, currencySymbol)}
            </button>
          </div>

          {/* 4. OTHER EXPENSES (TAX & INTEREST) */}
          {otherAccounts.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="border-b border-slate-300 pb-1 flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tax, Interest &amp; Other Expenses
                </h4>
              </div>

              <div className="divide-y divide-slate-200">
                {filterZero(otherAccounts, pnlData.otherExpenseMap).map(account => (
                  <div key={account.id} className="flex justify-between items-center py-2 text-xs hover:bg-slate-50 px-1 transition-colors">
                    <div>
                      <button
                        onClick={() => onDrillDown?.(account.id)}
                        className="text-slate-900 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
                        title={`Click to view transaction breakdown for ${account.name}`}
                      >
                        {account.name}
                      </button>
                      <span className="text-[10px] text-slate-500 font-mono ml-2">#{account.id}</span>
                    </div>
                    <button
                      onClick={() => onDrillDown?.(account.id)}
                      className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                      title={`Click to drill down into transactions for ${account.name}`}
                    >
                      {formatGAAPCurrency(pnlData.otherExpenseMap[account.id] || 0, currencySymbol)}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-semibold text-slate-800">
                <span>Total Other Expenses</span>
                <button
                  onClick={() => onDrillDown?.(otherAccounts[0]?.id)}
                  className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                  title="Click to view other expenses breakdown"
                >
                  {formatGAAPCurrency(pnlData.totalOtherExpense, currencySymbol)}
                </button>
              </div>
            </div>
          )}

          {/* BOTTOM LINE: NET INCOME (LOSS) */}
          <div className="mt-6 p-4 rounded-lg bg-slate-100 border-2 border-slate-900 flex justify-between items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-900 block font-serif">
                Net Income (Loss)
              </span>
              <span className="text-[11px] text-slate-600 font-mono">
                Net Profit Margin: {pnlData.netProfitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="text-right">
              <button
                onClick={() => onDrillDown?.(revenueAccounts[0]?.id || operatingExpenseAccounts[0]?.id)}
                className={`text-xl font-bold font-mono underline decoration-double decoration-2 hover:opacity-80 cursor-pointer transition-opacity ${
                  pnlData.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
                title="Click to view net income transactions breakdown"
              >
                {formatGAAPCurrency(pnlData.netIncome, currencySymbol)}
              </button>
            </div>
          </div>

        </div>

        {/* GAAP Notes */}
        {includeNotes && (
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-2 font-sans">
            <h5 className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
              Notes to Financial Statements
            </h5>
            <p className="leading-relaxed">
              <strong>Revenue Recognition:</strong> Revenue is recognized when performance obligations under customer contracts are satisfied, either over time or at a point in time, in an amount reflecting consideration entitled (ASC 606).
            </p>
            <p className="leading-relaxed">
              <strong>Cost Allocations:</strong> General administrative expenses are recorded as incurred under the accrual basis of accounting.
            </p>
          </div>
        )}

        {/* Signatures */}
        {includeSignatures && (
          <div className="border-t border-slate-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Prepared by Finance Director</p>
              <p className="text-[10px] text-slate-500">{company?.name || 'Finex Global Enterprises Inc.'}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Audit &amp; Compliance Committee</p>
              <p className="text-[10px] text-slate-500">Board Approval Sign-off</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
