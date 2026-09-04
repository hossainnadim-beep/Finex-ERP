/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import ReportHeader from './ReportHeader';
import { formatGAAPCurrency, computeAccountBalances } from './reportUtils';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface BalanceSheetReportProps {
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

export default function BalanceSheetReport({
  company,
  accounts,
  entries,
  asOfDate,
  accountingBasis,
  includeNotes,
  includeSignatures,
  collapseZeroBalances,
  onDrillDown
}: BalanceSheetReportProps) {
  const currencySymbol = company?.currencySymbol || '$';

  // Compute account balances up to the as-of date
  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.date <= asOfDate && !e.isReversed);
  }, [entries, asOfDate]);

  const balances = useMemo(() => {
    return computeAccountBalances(accounts, filteredEntries);
  }, [accounts, filteredEntries]);

  // Aggregate assets, liabilities, equity, revenues, expenses up to as-of date
  const financialData = useMemo(() => {
    let totalAssets = 0;
    let currentAssetsTotal = 0;
    let nonCurrentAssetsTotal = 0;

    let totalLiabilities = 0;
    let currentLiabilitiesTotal = 0;
    let longTermLiabilitiesTotal = 0;

    let totalStatedEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    const assetList: Array<{ account: Account; balance: number; isCurrent: boolean }> = [];
    const liabilityList: Array<{ account: Account; balance: number; isCurrent: boolean }> = [];
    const equityList: Array<{ account: Account; balance: number }> = [];

    accounts.forEach(acc => {
      const bal = balances[acc.id]?.final || 0;
      const isCurrent = !acc.name.toLowerCase().includes('equipment') && 
                        !acc.name.toLowerCase().includes('property') && 
                        !acc.name.toLowerCase().includes('building') &&
                        !acc.name.toLowerCase().includes('long-term') &&
                        !acc.name.toLowerCase().includes('depreciation');

      if (acc.class === 'Asset') {
        assetList.push({ account: acc, balance: bal, isCurrent });
        totalAssets += bal;
        if (isCurrent) currentAssetsTotal += bal;
        else nonCurrentAssetsTotal += bal;
      } else if (acc.class === 'Liability') {
        const isCurrentLiab = !acc.name.toLowerCase().includes('long-term') && 
                              !acc.name.toLowerCase().includes('mortgage') &&
                              !acc.name.toLowerCase().includes('bond');
        liabilityList.push({ account: acc, balance: bal, isCurrent: isCurrentLiab });
        totalLiabilities += bal;
        if (isCurrentLiab) currentLiabilitiesTotal += bal;
        else longTermLiabilitiesTotal += bal;
      } else if (acc.class === 'Equity') {
        equityList.push({ account: acc, balance: bal });
        totalStatedEquity += bal;
      } else if (acc.class === 'Revenue') {
        totalRevenue += bal;
      } else if (acc.class === 'Expense') {
        totalExpenses += bal;
      }
    });

    // Net income up to the as-of date flows into retained earnings / current year earnings
    const currentPeriodNetIncome = totalRevenue - totalExpenses;
    const totalEquity = totalStatedEquity + currentPeriodNetIncome;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) === 0;
    const discrepancy = Math.abs(totalAssets - totalLiabilitiesAndEquity);

    return {
      assetList,
      liabilityList,
      equityList,
      totalAssets,
      currentAssetsTotal,
      nonCurrentAssetsTotal,
      totalLiabilities,
      currentLiabilitiesTotal,
      longTermLiabilitiesTotal,
      totalStatedEquity,
      currentPeriodNetIncome,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      discrepancy
    };
  }, [accounts, balances]);

  const filterZero = (items: Array<{ account: Account; balance: number }>) => {
    if (!collapseZeroBalances) return items;
    return items.filter(i => i.balance !== 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 print:shadow-none print:border-none">
      
      {/* 3-Line GAAP Header with Company Name */}
      <ReportHeader
        company={company}
        reportTitle="Balance Sheet"
        reportSubtitle="Statement of Financial Position"
        dateType="as_of"
        asOfDate={asOfDate}
        accountingBasis={accountingBasis}
        currencyCode={company?.currency || 'USD'}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 sm:p-8 space-y-8">

        {/* Dual-Entry Accounting Balance Banner */}
        <div className={`p-4 rounded-lg border text-xs flex items-center justify-between gap-4 ${
          financialData.isBalanced 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            {financialData.isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            )}
            <div>
              <span className={`font-bold uppercase tracking-wider text-[11px] block ${financialData.isBalanced ? 'text-emerald-900' : 'text-amber-900'}`}>
                {financialData.isBalanced ? 'Dual-Entry Accounting Equation in Balance' : 'Out-of-Balance Warning Flagged'}
              </span>
              <p className={`text-[11px] mt-0.5 font-medium ${financialData.isBalanced ? 'text-emerald-800' : 'text-amber-800'}`}>
                {financialData.isBalanced
                  ? `Assets (${formatGAAPCurrency(financialData.totalAssets, currencySymbol)}) = Liabilities (${formatGAAPCurrency(financialData.totalLiabilities, currencySymbol)}) + Stockholders' Equity (${formatGAAPCurrency(financialData.totalEquity, currencySymbol)})`
                  : `Discrepancy detected: ${formatGAAPCurrency(financialData.discrepancy, currencySymbol)}. Please review general ledger journal entries.`
                }
              </p>
            </div>
          </div>
          <span className={`font-mono font-bold text-xs shrink-0 px-2.5 py-1 rounded border ${
            financialData.isBalanced
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            A = L + E
          </span>
        </div>

        {/* Statement Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
          
          {/* LEFT COLUMN: ASSETS */}
          <div className="space-y-6">
            <div className="border-b-2 border-slate-900 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-serif">
                Assets
              </h3>
            </div>

            {/* Current Assets */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Current Assets
              </h4>
              <div className="divide-y divide-slate-200">
                {filterZero(financialData.assetList.filter(a => a.isCurrent)).map(({ account, balance }) => (
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
                      title={`Click to drill down into transaction report for ${account.name}`}
                    >
                      {formatGAAPCurrency(balance, currencySymbol)}
                    </button>
                  </div>
                ))}
                {filterZero(financialData.assetList.filter(a => a.isCurrent)).length === 0 && (
                  <p className="text-xs text-slate-500 italic py-2">No current asset accounts</p>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-semibold text-slate-800">
                <span>Total Current Assets</span>
                <button
                  onClick={() => onDrillDown?.(financialData.assetList.find(a => a.isCurrent)?.account.id)}
                  className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                  title="Click to view transactions breakdown"
                >
                  {formatGAAPCurrency(financialData.currentAssetsTotal, currencySymbol)}
                </button>
              </div>
            </div>

            {/* Non-Current / Fixed Assets */}
            {financialData.assetList.some(a => !a.isCurrent) && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Non-Current &amp; Fixed Assets
                </h4>
                <div className="divide-y divide-slate-200">
                  {filterZero(financialData.assetList.filter(a => !a.isCurrent)).map(({ account, balance }) => (
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
                        title={`Click to drill down into transaction report for ${account.name}`}
                      >
                        {formatGAAPCurrency(balance, currencySymbol)}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-semibold text-slate-800">
                  <span>Total Non-Current Assets</span>
                  <button
                    onClick={() => onDrillDown?.(financialData.assetList.find(a => !a.isCurrent)?.account.id)}
                    className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                    title="Click to view transactions breakdown"
                  >
                    {formatGAAPCurrency(financialData.nonCurrentAssetsTotal, currencySymbol)}
                  </button>
                </div>
              </div>
            )}

            {/* TOTAL ASSETS ROW */}
            <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-sm font-bold text-slate-900 uppercase tracking-wide bg-slate-100 p-3 rounded">
              <span>Total Assets</span>
              <button
                onClick={() => onDrillDown?.(financialData.assetList[0]?.account.id)}
                className="font-mono text-slate-900 underline decoration-double decoration-2 text-base font-bold hover:text-blue-600 cursor-pointer transition-colors"
                title="Click to drill down into asset transactions"
              >
                {formatGAAPCurrency(financialData.totalAssets, currencySymbol)}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LIABILITIES AND STOCKHOLDERS' EQUITY */}
          <div className="space-y-6">
            
            {/* LIABILITIES SECTION */}
            <div className="space-y-4">
              <div className="border-b-2 border-slate-900 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-serif">
                  Liabilities
                </h3>
              </div>

              {/* Current Liabilities */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Current Liabilities
                </h4>
                <div className="divide-y divide-slate-200">
                  {filterZero(financialData.liabilityList.filter(l => l.isCurrent)).map(({ account, balance }) => (
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
                        title={`Click to drill down into transaction report for ${account.name}`}
                      >
                        {formatGAAPCurrency(balance, currencySymbol)}
                      </button>
                    </div>
                  ))}
                  {filterZero(financialData.liabilityList.filter(l => l.isCurrent)).length === 0 && (
                    <p className="text-xs text-slate-500 italic py-2">No current liability accounts</p>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-semibold text-slate-800">
                  <span>Total Current Liabilities</span>
                  <button
                    onClick={() => onDrillDown?.(financialData.liabilityList.find(l => l.isCurrent)?.account.id)}
                    className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-semibold"
                    title="Click to view transactions breakdown"
                  >
                    {formatGAAPCurrency(financialData.currentLiabilitiesTotal, currencySymbol)}
                  </button>
                </div>
              </div>

              {/* Long Term Liabilities */}
              {financialData.liabilityList.some(l => !l.isCurrent) && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Long-Term Liabilities
                  </h4>
                  <div className="divide-y divide-slate-200">
                    {filterZero(financialData.liabilityList.filter(l => !l.isCurrent)).map(({ account, balance }) => (
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
                          title={`Click to drill down into transaction report for ${account.name}`}
                        >
                          {formatGAAPCurrency(balance, currencySymbol)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-400 text-xs font-bold text-slate-900 uppercase">
                <span>Total Liabilities</span>
                <button
                  onClick={() => onDrillDown?.(financialData.liabilityList[0]?.account.id)}
                  className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-bold"
                  title="Click to view liabilities breakdown"
                >
                  {formatGAAPCurrency(financialData.totalLiabilities, currencySymbol)}
                </button>
              </div>
            </div>

            {/* STOCKHOLDERS' EQUITY SECTION */}
            <div className="space-y-4 pt-2">
              <div className="border-b-2 border-slate-900 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-serif">
                  Stockholders' Equity
                </h3>
              </div>

              <div className="divide-y divide-slate-200">
                {filterZero(financialData.equityList).map(({ account, balance }) => (
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
                      title={`Click to drill down into transaction report for ${account.name}`}
                    >
                      {formatGAAPCurrency(balance, currencySymbol)}
                    </button>
                  </div>
                ))}

                {/* Net Income line item recognized in Equity */}
                <div className="flex justify-between items-center py-2 text-xs hover:bg-slate-50 px-1 transition-colors">
                  <div>
                    <button
                      onClick={() => onDrillDown?.('4000')}
                      className="text-slate-800 font-medium italic hover:text-blue-600 hover:underline cursor-pointer text-left"
                      title="Click to view revenue & expense transactions"
                    >
                      Current Year Operating Net Income (Loss)
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">P&amp;L Retained</span>
                  </div>
                  <button
                    onClick={() => onDrillDown?.('4000')}
                    className={`font-mono font-bold hover:underline cursor-pointer transition-colors ${
                      financialData.currentPeriodNetIncome >= 0 
                        ? 'text-emerald-700' 
                        : 'text-rose-700'
                    }`}
                    title="Click to drill down into operating transactions"
                  >
                    {formatGAAPCurrency(financialData.currentPeriodNetIncome, currencySymbol)}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-bold text-slate-900">
                <span>Total Stockholders' Equity</span>
                <button
                  onClick={() => onDrillDown?.(financialData.equityList[0]?.account.id)}
                  className="font-mono hover:text-blue-600 hover:underline cursor-pointer transition-colors font-bold"
                  title="Click to view equity transactions breakdown"
                >
                  {formatGAAPCurrency(financialData.totalEquity, currencySymbol)}
                </button>
              </div>
            </div>

            {/* TOTAL LIABILITIES & EQUITY ROW */}
            <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-sm font-bold text-slate-900 uppercase tracking-wide bg-slate-100 p-3 rounded">
              <span>Total Liabilities &amp; Stockholders' Equity</span>
              <button
                onClick={() => onDrillDown?.(financialData.equityList[0]?.account.id)}
                className="font-mono text-slate-900 underline decoration-double decoration-2 text-base font-bold hover:text-blue-600 cursor-pointer transition-colors"
                title="Click to view transactions breakdown"
              >
                {formatGAAPCurrency(financialData.totalLiabilitiesAndEquity, currencySymbol)}
              </button>
            </div>
          </div>

        </div>

        {/* GAAP Notes & Explanatory Disclosures */}
        {includeNotes && (
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-2 font-sans">
            <h5 className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
              Notes to Financial Statements (GAAP Disclosures)
            </h5>
            <p className="leading-relaxed">
              <strong>Note 1 — Summary of Significant Accounting Policies:</strong> The accompanying financial statements of {company?.legalName || company?.name || 'the Company'} have been prepared in accordance with accounting principles generally accepted in the United States of America (US GAAP) on the {accountingBasis.toLowerCase()} basis of accounting.
            </p>
            <p className="leading-relaxed">
              <strong>Note 2 — Cash and Cash Equivalents:</strong> Cash and cash equivalents consist of demand deposits in federally insured financial institutions and highly liquid short-term investments with original maturities of three months or less.
            </p>
            <p className="leading-relaxed">
              <strong>Note 3 — Capitalization and Equity:</strong> Stockholders' equity includes stated capital contributions and cumulative retained earnings adjusted for current period operating net income of {formatGAAPCurrency(financialData.currentPeriodNetIncome, currencySymbol)}.
            </p>
          </div>
        )}

        {/* Auditor / Management Signatures */}
        {includeSignatures && (
          <div className="border-t border-slate-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Chief Financial Officer / Controller</p>
              <p className="text-[10px] text-slate-500">{company?.name || 'Finex Global Enterprises Inc.'}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Certified Public Accountant / Auditor</p>
              <p className="text-[10px] text-slate-500">Independent Assurance Representative</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
