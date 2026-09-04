/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, CompanySettings } from '../../types';
import ReportHeader from './ReportHeader';
import { formatGAAPCurrency, computeAccountBalances } from './reportUtils';
import { Coins } from 'lucide-react';

interface CashFlowReportProps {
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

export default function CashFlowReport({
  company,
  accounts,
  entries,
  startDate,
  endDate,
  accountingBasis,
  includeNotes,
  includeSignatures,
  onDrillDown
}: CashFlowReportProps) {
  const currencySymbol = company?.currencySymbol || '$';

  // Find cash accounts
  const cashAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.class === 'Asset' && 
      (a.name.toLowerCase().includes('cash') || 
       a.name.toLowerCase().includes('bank') || 
       a.name.toLowerCase().includes('checking') ||
       a.name.toLowerCase().includes('savings') ||
       a.id === '1010' || a.id === '1020')
    );
  }, [accounts]);

  const cashAccountIds = useMemo(() => new Set(cashAccounts.map(a => a.id)), [cashAccounts]);

  // Compute Cash Flow Data
  const cashFlowData = useMemo(() => {
    // 1. Beginning Cash: Sum of cash balances prior to startDate
    const priorEntries = entries.filter(e => e.date < startDate && !e.isReversed);
    const priorBalances = computeAccountBalances(accounts, priorEntries);
    let beginningCash = 0;
    cashAccountIds.forEach(id => {
      beginningCash += priorBalances[id]?.final || 0;
    });

    // 2. Filter period entries
    const periodEntries = entries.filter(e => e.date >= startDate && e.date <= endDate && !e.isReversed);

    // Compute Net Income for the period
    let periodRevenue = 0;
    let periodExpenses = 0;
    let depreciationExpense = 0;
    let arChange = 0;
    let inventoryChange = 0;
    let apChange = 0;
    let accruedLiabChange = 0;

    let capexPurchases = 0;
    let equipmentSales = 0;

    let equityContributions = 0;
    let debtBorrowings = 0;
    let ownerDraws = 0;

    periodEntries.forEach(entry => {
      entry.lines.forEach(line => {
        const acc = accounts.find(a => a.id === line.accountId);
        if (!acc) return;

        if (acc.class === 'Revenue') {
          periodRevenue += (line.credit - line.debit);
        } else if (acc.class === 'Expense') {
          const exp = line.debit - line.credit;
          periodExpenses += exp;
          if (acc.name.toLowerCase().includes('depreciation') || acc.name.toLowerCase().includes('amortization')) {
            depreciationExpense += exp;
          }
        } else if (acc.class === 'Asset' && !cashAccountIds.has(acc.id)) {
          // Accounts Receivable change: An increase in AR reduces operating cash
          if (acc.name.toLowerCase().includes('receivable') || acc.id === '1100') {
            arChange += (line.debit - line.credit);
          } else if (acc.name.toLowerCase().includes('inventory') || acc.id === '1200') {
            inventoryChange += (line.debit - line.credit);
          } else if (acc.name.toLowerCase().includes('equipment') || acc.name.toLowerCase().includes('property') || acc.name.toLowerCase().includes('fixed')) {
            capexPurchases += (line.debit - line.credit);
          }
        } else if (acc.class === 'Liability') {
          if (acc.name.toLowerCase().includes('payable') || acc.id === '2010') {
            apChange += (line.credit - line.debit);
          } else if (acc.name.toLowerCase().includes('accrued') || acc.id === '2050') {
            accruedLiabChange += (line.credit - line.debit);
          } else if (acc.name.toLowerCase().includes('debt') || acc.name.toLowerCase().includes('loan') || acc.name.toLowerCase().includes('note')) {
            debtBorrowings += (line.credit - line.debit);
          }
        } else if (acc.class === 'Equity') {
          if (acc.name.toLowerCase().includes('stock') || acc.name.toLowerCase().includes('capital') || acc.id === '3010') {
            equityContributions += (line.credit - line.debit);
          } else if (acc.name.toLowerCase().includes('draw') || acc.name.toLowerCase().includes('dividend')) {
            ownerDraws += (line.debit - line.credit);
          }
        }
      });
    });

    const netIncome = periodRevenue - periodExpenses;
    const netCashOperating = netIncome + depreciationExpense - arChange - inventoryChange + apChange + accruedLiabChange;
    const netCashInvesting = -capexPurchases + equipmentSales;
    const netCashFinancing = equityContributions + debtBorrowings - ownerDraws;

    const netChangeInCash = netCashOperating + netCashInvesting + netCashFinancing;
    const endingCash = beginningCash + netChangeInCash;

    return {
      beginningCash,
      netIncome,
      depreciationExpense,
      arChange,
      inventoryChange,
      apChange,
      accruedLiabChange,
      netCashOperating,
      capexPurchases,
      netCashInvesting,
      equityContributions,
      debtBorrowings,
      ownerDraws,
      netCashFinancing,
      netChangeInCash,
      endingCash
    };
  }, [accounts, entries, startDate, endDate, cashAccountIds]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 print:shadow-none print:border-none">
      
      {/* 3-Line GAAP Header with Company Name */}
      <ReportHeader
        company={company}
        reportTitle="Statement of Cash Flows"
        reportSubtitle="US GAAP ASC 230 Direct & Indirect Method"
        dateType="period"
        startDate={startDate}
        endDate={endDate}
        accountingBasis={accountingBasis}
        currencyCode={company?.currency || 'USD'}
        currencySymbol={currencySymbol}
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-3xl mx-auto">
        
        {/* Cash Position Banner */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-amber-600" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                Ending Liquid Cash Reserves
              </span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className="text-lg font-bold font-mono text-slate-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                title="Click to view cash transactions breakdown"
              >
                {formatGAAPCurrency(cashFlowData.endingCash, currencySymbol)}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Period Net Change</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className={`font-bold hover:underline cursor-pointer transition-colors ${cashFlowData.netChangeInCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                title="Click to view cash change transactions"
              >
                {formatGAAPCurrency(cashFlowData.netChangeInCash, currencySymbol)}
              </button>
            </div>
            <div className="border-l border-slate-300 pl-4">
              <span className="text-slate-500 block">Beginning Cash</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className="text-slate-800 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                title="Click to view cash forward balance"
              >
                {formatGAAPCurrency(cashFlowData.beginningCash, currencySymbol)}
              </button>
            </div>
          </div>
        </div>

        {/* Statement Structure */}
        <div className="space-y-6 text-xs">
          
          {/* SECTION 1: OPERATING ACTIVITIES */}
          <div className="space-y-3">
            <div className="border-b-2 border-slate-900 pb-1.5 flex justify-between items-center">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 font-serif">
                1. Cash Flows from Operating Activities
              </h3>
              <span className="text-[10px] text-slate-500 font-mono font-medium">Indirect Reconciliation</span>
            </div>

            <div className="divide-y divide-slate-200">
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-900 font-medium">Net Operating Income (Profit)</span>
                <button
                  onClick={() => onDrillDown?.(accounts.find(a => a.class === 'Revenue' || a.class === 'Expense')?.id)}
                  className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                  title="Click to view operating income transactions"
                >
                  {formatGAAPCurrency(cashFlowData.netIncome, currencySymbol)}
                </button>
              </div>

              {cashFlowData.depreciationExpense !== 0 && (
                <div className="flex justify-between items-center py-2 text-slate-700">
                  <span className="pl-3">Adjustments for non-cash depreciation &amp; amortization</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('depreciation'))?.id)}
                    className="font-mono text-emerald-700 font-semibold hover:underline cursor-pointer transition-colors"
                    title="Click to view depreciation transactions"
                  >
                    {formatGAAPCurrency(cashFlowData.depreciationExpense, currencySymbol)}
                  </button>
                </div>
              )}

              {cashFlowData.arChange !== 0 && (
                <div className="flex justify-between items-center py-2 text-slate-700">
                  <span className="pl-3">Change in Accounts Receivable (Customer balances)</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.id === '1020' || a.name.toLowerCase().includes('receivable'))?.id)}
                    className={`font-mono font-medium hover:underline cursor-pointer transition-colors ${cashFlowData.arChange > 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                    title="Click to view A/R transactions"
                  >
                    {formatGAAPCurrency(-cashFlowData.arChange, currencySymbol)}
                  </button>
                </div>
              )}

              {cashFlowData.inventoryChange !== 0 && (
                <div className="flex justify-between items-center py-2 text-slate-700">
                  <span className="pl-3">Change in Inventory &amp; Operating Supplies</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('inventory'))?.id)}
                    className={`font-mono font-medium hover:underline cursor-pointer transition-colors ${cashFlowData.inventoryChange > 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                    title="Click to view inventory transactions"
                  >
                    {formatGAAPCurrency(-cashFlowData.inventoryChange, currencySymbol)}
                  </button>
                </div>
              )}

              {cashFlowData.apChange !== 0 && (
                <div className="flex justify-between items-center py-2 text-slate-700">
                  <span className="pl-3">Change in Accounts Payable (Vendor obligations)</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.id === '2000' || a.name.toLowerCase().includes('payable'))?.id)}
                    className={`font-mono font-medium hover:underline cursor-pointer transition-colors ${cashFlowData.apChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                    title="Click to view A/P transactions"
                  >
                    {formatGAAPCurrency(cashFlowData.apChange, currencySymbol)}
                  </button>
                </div>
              )}

              {cashFlowData.accruedLiabChange !== 0 && (
                <div className="flex justify-between items-center py-2 text-slate-700">
                  <span className="pl-3">Change in Accrued Liabilities &amp; Operating Expenses</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('accrued'))?.id)}
                    className="font-mono text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                    title="Click to view accrued liabilities transactions"
                  >
                    {formatGAAPCurrency(cashFlowData.accruedLiabChange, currencySymbol)}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-bold text-slate-900 bg-slate-100 p-2.5 rounded">
              <span>Net Cash Provided by (Used in) Operating Activities</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className={`font-mono text-sm font-bold hover:text-blue-600 hover:underline cursor-pointer transition-colors ${cashFlowData.netCashOperating >= 0 ? 'text-slate-900' : 'text-rose-700'}`}
                title="Click to view cash transactions breakdown"
              >
                {formatGAAPCurrency(cashFlowData.netCashOperating, currencySymbol)}
              </button>
            </div>
          </div>

          {/* SECTION 2: INVESTING ACTIVITIES */}
          <div className="space-y-3 pt-2">
            <div className="border-b-2 border-slate-900 pb-1.5">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 font-serif">
                2. Cash Flows from Investing Activities
              </h3>
            </div>

            <div className="divide-y divide-slate-200">
              {cashFlowData.capexPurchases !== 0 ? (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-700 pl-3">Capital expenditures for equipment and fixed assets</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('equipment') || a.name.toLowerCase().includes('property') || a.name.toLowerCase().includes('fixed'))?.id)}
                    className="font-mono text-rose-700 font-semibold hover:underline cursor-pointer transition-colors"
                    title="Click to view fixed assets transactions"
                  >
                    ({formatGAAPCurrency(cashFlowData.capexPurchases, currencySymbol)})
                  </button>
                </div>
              ) : (
                <div className="text-slate-500 italic py-2 pl-3">No capital investments recorded in period</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-bold text-slate-900 bg-slate-100 p-2.5 rounded">
              <span>Net Cash Provided by (Used in) Investing Activities</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className="font-mono text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                title="Click to view investing transactions"
              >
                {formatGAAPCurrency(cashFlowData.netCashInvesting, currencySymbol)}
              </button>
            </div>
          </div>

          {/* SECTION 3: FINANCING ACTIVITIES */}
          <div className="space-y-3 pt-2">
            <div className="border-b-2 border-slate-900 pb-1.5">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 font-serif">
                3. Cash Flows from Financing Activities
              </h3>
            </div>

            <div className="divide-y divide-slate-200">
              {cashFlowData.equityContributions !== 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-700 pl-3">Proceeds from common stock issuance &amp; capital investments</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.class === 'Equity')?.id)}
                    className="font-mono text-emerald-700 font-semibold hover:underline cursor-pointer transition-colors"
                    title="Click to view equity contribution transactions"
                  >
                    {formatGAAPCurrency(cashFlowData.equityContributions, currencySymbol)}
                  </button>
                </div>
              )}

              {cashFlowData.debtBorrowings !== 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-700 pl-3">Borrowings / (Repayment) of notes payable</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('debt') || a.name.toLowerCase().includes('loan') || a.name.toLowerCase().includes('note'))?.id)}
                    className="font-mono text-slate-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                    title="Click to view notes payable transactions"
                  >
                    {formatGAAPCurrency(cashFlowData.debtBorrowings, currencySymbol)}
                  </button>
                </div>
              )}

              {cashFlowData.ownerDraws !== 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-700 pl-3">Distributions to owners &amp; dividend payments</span>
                  <button
                    onClick={() => onDrillDown?.(accounts.find(a => a.name.toLowerCase().includes('draw') || a.name.toLowerCase().includes('distribution'))?.id)}
                    className="font-mono text-rose-700 font-semibold hover:underline cursor-pointer transition-colors"
                    title="Click to view distribution transactions"
                  >
                    ({formatGAAPCurrency(cashFlowData.ownerDraws, currencySymbol)})
                  </button>
                </div>
              )}

              {cashFlowData.equityContributions === 0 && cashFlowData.debtBorrowings === 0 && cashFlowData.ownerDraws === 0 && (
                <div className="text-slate-500 italic py-2 pl-3">No financing activity recorded in period</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-xs font-bold text-slate-900 bg-slate-100 p-2.5 rounded">
              <span>Net Cash Provided by (Used in) Financing Activities</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className="font-mono text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                title="Click to view financing transactions"
              >
                {formatGAAPCurrency(cashFlowData.netCashFinancing, currencySymbol)}
              </button>
            </div>
          </div>

          {/* NET RECONCILIATION SUMMARY */}
          <div className="border-t-2 border-slate-900 pt-4 space-y-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between items-center font-bold text-slate-900">
              <span>Net Increase / (Decrease) in Cash and Cash Equivalents</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className={`font-mono text-sm hover:underline cursor-pointer transition-colors ${cashFlowData.netChangeInCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                title="Click to view cash transactions breakdown"
              >
                {formatGAAPCurrency(cashFlowData.netChangeInCash, currencySymbol)}
              </button>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span>Cash and Cash Equivalents at Beginning of Period</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                title="Click to view cash forward balance"
              >
                {formatGAAPCurrency(cashFlowData.beginningCash, currencySymbol)}
              </button>
            </div>
            <div className="flex justify-between items-center font-bold text-slate-900 border-t-2 border-slate-900 pt-2 text-sm">
              <span>Cash and Cash Equivalents at End of Period</span>
              <button
                onClick={() => onDrillDown?.(cashAccounts[0]?.id)}
                className="font-mono underline decoration-double decoration-2 text-slate-900 font-bold hover:text-blue-600 cursor-pointer transition-colors"
                title="Click to view cash transactions breakdown"
              >
                {formatGAAPCurrency(cashFlowData.endingCash, currencySymbol)}
              </button>
            </div>
          </div>

        </div>

        {/* GAAP Notes */}
        {includeNotes && (
          <div className="border-t border-slate-200 pt-6 text-xs text-slate-700 space-y-2 font-sans">
            <h5 className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
              Notes to Statement of Cash Flows
            </h5>
            <p className="leading-relaxed">
              <strong>Non-Cash Operating Items:</strong> Cash flows from operating activities are calculated using the indirect method under US GAAP ASC 230, reconciling net accrual income to operating cash flow by adjusting for non-cash expenses and working capital balance sheet variations.
            </p>
          </div>
        )}

        {/* Signatures */}
        {includeSignatures && (
          <div className="border-t border-slate-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-sans">
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Treasury / Chief Financial Officer</p>
              <p className="text-[10px] text-slate-500">{company?.name || 'Finex Global Enterprises Inc.'}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-slate-900">Controller &amp; Cash Manager</p>
              <p className="text-[10px] text-slate-500">Authorized Financial Signatory</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
