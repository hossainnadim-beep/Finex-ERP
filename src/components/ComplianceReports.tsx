/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Account, JournalEntry, UserSession } from '../types';
import { 
  BarChart3, 
  FileCheck, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  Printer, 
  Archive, 
  FileText,
  Activity
} from 'lucide-react';

interface ComplianceReportsProps {
  accounts: Account[];
  entries: JournalEntry[];
  session: UserSession | null;
}

export default function ComplianceReports({ accounts, entries, session }: ComplianceReportsProps) {
  const [reportType, setReportType] = useState<'balancesheet' | 'income'>('balancesheet');

  // Compute account balances dynamically in real time
  const accountBalances = useMemo(() => {
    const balances: Record<string, { debits: number; credits: number; final: number }> = {};

    accounts.forEach(acc => {
      balances[acc.id] = { debits: 0, credits: 0, final: 0 };
    });

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (!balances[line.accountId]) {
          balances[line.accountId] = { debits: 0, credits: 0, final: 0 };
        }
        balances[line.accountId].debits += line.debit;
        balances[line.accountId].credits += line.credit;
      });
    });

    accounts.forEach(acc => {
      const b = balances[acc.id] || { debits: 0, credits: 0, final: 0 };
      if (acc.normalBalance === 'Debit') {
        b.final = b.debits - b.credits;
      } else {
        b.final = b.credits - b.debits;
      }
    });

    return balances;
  }, [entries, accounts]);

  // Compute report aggregates
  const summary = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    accounts.forEach(acc => {
      const bal = accountBalances[acc.id]?.final || 0;
      switch (acc.class) {
        case 'Asset':
          totalAssets += bal;
          break;
        case 'Liability':
          totalLiabilities += bal;
          break;
        case 'Equity':
          totalEquity += bal;
          break;
        case 'Revenue':
          totalRevenue += bal;
          break;
        case 'Expense':
          totalExpenses += bal;
          break;
      }
    });

    const netIncome = totalRevenue - totalExpenses;
    const finalEquityIncludingNetIncome = totalEquity + netIncome;
    const balanceAlert = Math.abs(totalAssets - (totalLiabilities + finalEquityIncludingNetIncome));

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome,
      finalEquityIncludingNetIncome,
      isEquationBalanced: balanceAlert === 0,
      balanceAlertCents: balanceAlert
    };
  }, [accountBalances, accounts]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Tab select & printable controls */}
      <div className="bg-[#121214] rounded border border-zinc-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-blue-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-355">Compliance Statement Reports</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Statement Select */}
          <div className="flex rounded bg-zinc-900 p-1 border border-zinc-805 text-xs select-none">
            <button
              onClick={() => setReportType('balancesheet')}
              className={`px-3.5 py-1.5 font-medium rounded transition-all cursor-pointer ${
                reportType === 'balancesheet' 
                  ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              id="report-select-balancesheet"
            >
              Balance Sheet
            </button>
            <button
              onClick={() => setReportType('income')}
              className={`px-3.5 py-1.5 font-medium rounded transition-all cursor-pointer ${
                reportType === 'income' 
                  ? 'bg-zinc-800 text-zinc-100 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              id="report-select-income"
            >
              Income Statement (P&L)
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-702 text-zinc-400 hover:text-white rounded text-xs transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            title="Print Current Statement"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Print</span>
          </button>
        </div>

      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 shadow-xl space-y-6 print:bg-white print:text-black font-sans">
        
        {/* Statement Header */}
        <div className="text-center pb-6 border-b border-zinc-850 print:border-zinc-300">
          <span className="text-[10px] text-blue-500 font-bold font-mono tracking-widest uppercase block mb-1">
            Official GAAP Compliant Entity
          </span>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 print:text-zinc-900">Finex ERP Ledger Systems</h1>
          <h2 className="text-sm text-zinc-400 print:text-zinc-650 mt-1 uppercase tracking-wider font-semibold">
            {reportType === 'balancesheet' ? 'Balance Sheet Statement' : 'Profit & Loss Operating Statement'}
          </h2>
          <div className="text-[10px] font-mono text-zinc-500 print:text-zinc-500 mt-2">
            Reporting Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Time (UTC): {new Date().toISOString().replace('T', ' ').slice(0, 19)}
          </div>
        </div>

        {/* Dynamic Inner Statement Views */}
        {reportType === 'balancesheet' ? (
          <div className="space-y-6">
            
            {/* Balance sheet compliance matching badge */}
            {summary.isEquationBalanced ? (
              <div className="p-3.5 bg-blue-950/20 border border-blue-800/40 rounded flex gap-2.5 text-xs text-blue-300 print:bg-blue-50 print:border-blue-200 print:text-blue-800" id="statement-match-alert">
                <FileCheck className="h-4.5 w-4.5 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <strong className="font-bold block uppercase tracking-wider text-[10px]">Dual-Entry Compliance Met</strong>
                  <p className="mt-0.5 leading-relaxed font-sans text-[11px]">
                    All operational assets are perfectly supported by obligations and shareholder capital allocations.
                  </p>
                  <div className="font-mono text-blue-400 print:text-blue-600 mt-1.5 text-[11px] font-bold">
                    Assets ({formatCurrency(summary.totalAssets)}) = Liabilities ({formatCurrency(summary.totalLiabilities)}) + Equity ({formatCurrency(summary.finalEquityIncludingNetIncome)})
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-950/20 border border-amber-850 text-xs text-amber-300 rounded flex gap-2.5 print:bg-amber-50 print:border-amber-200 print:text-amber-800" id="statement-conflict-alert">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong className="font-bold block uppercase tracking-wider text-[10px]">Asymmetric Balance Discrepancy Flagged</strong>
                  <p className="mt-0.5 leading-relaxed text-[11px]">
                    The current general ledger is asymmetrical. Delta discrepancy: {formatCurrency(summary.balanceAlertCents)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              
              {/* Left Side: ASSETS */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800 print:border-zinc-300 pb-2 flex justify-between">
                  <span>Current Enterprise Assets</span>
                  <span>debit items</span>
                </h4>
                
                <div className="divide-y divide-zinc-900/50 print:divide-zinc-100 space-y-1.5">
                  {accounts.filter(a => a.class === 'Asset').map(account => {
                    const val = accountBalances[account.id]?.final || 0;
                    return (
                      <div key={account.id} className="flex justify-between items-center text-xs py-1.5 hover:bg-zinc-900/30 px-1 rounded transition-colors">
                        <div>
                          <span className="font-semibold text-zinc-250 print:text-zinc-800">{account.name}</span>
                          <span className="block text-[10px] text-zinc-500 font-mono">#{account.id}</span>
                        </div>
                        <span className="font-mono text-zinc-105 print:text-zinc-900 font-bold">{formatCurrency(val)}</span>
                      </div>
                    );
                  })}
                  
                  {accounts.filter(a => a.class === 'Asset').length === 0 && (
                    <div className="text-zinc-500 italic text-[11px] p-2 text-center">No asset accounts found</div>
                  )}
                </div>

                <div className="pt-3.5 border-t-2 border-zinc-800 print:border-zinc-900 flex justify-between items-center font-bold text-xs text-zinc-200 print:text-zinc-900 uppercase tracking-wide">
                  <span>Total Corporate Assets</span>
                  <span className="font-mono text-blue-400 print:text-blue-700 underline decoration-double decoration-2 text-sm">{formatCurrency(summary.totalAssets)}</span>
                </div>
              </div>

              {/* Right Side: LIABILITIES & EQUITY */}
              <div className="space-y-6">
                
                {/* LIABILITIES Category */}
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800 print:border-zinc-300 pb-2 flex justify-between">
                    <span>Liabilities Obligations</span>
                    <span>credit items</span>
                  </h4>
                  
                  <div className="divide-y divide-zinc-900/50 print:divide-zinc-100 space-y-1.5">
                    {accounts.filter(a => a.class === 'Liability').map(account => {
                      const val = accountBalances[account.id]?.final || 0;
                      return (
                        <div key={account.id} className="flex justify-between items-center text-xs py-1.5 hover:bg-zinc-900/30 px-1 rounded transition-colors">
                          <div>
                            <span className="font-semibold text-zinc-250 print:text-zinc-800">{account.name}</span>
                            <span className="block text-[10px] text-zinc-500 font-mono">#{account.id}</span>
                          </div>
                          <span className="font-mono text-zinc-105 print:text-zinc-900 font-bold">{formatCurrency(val)}</span>
                        </div>
                      );
                    })}
                    
                    {accounts.filter(a => a.class === 'Liability').length === 0 && (
                      <div className="text-zinc-500 italic text-[11px] p-2 text-center">No liability accounts found</div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center font-bold text-xs text-zinc-400 print:text-zinc-600">
                    <span>Subtotal Liabilities</span>
                    <span className="font-mono">{formatCurrency(summary.totalLiabilities)}</span>
                  </div>
                </div>

                {/* EQUITY Category */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800 print:border-zinc-300 pb-2">
                    Shareholder's Equity Capital
                  </h4>
                  
                  <div className="divide-y divide-zinc-900/50 print:divide-zinc-100 space-y-1.5">
                    {accounts.filter(a => a.class === 'Equity').map(account => {
                      const val = accountBalances[account.id]?.final || 0;
                      return (
                        <div key={account.id} className="flex justify-between items-center text-xs py-1.5 hover:bg-zinc-900/30 px-1 rounded transition-colors">
                          <div>
                            <span className="font-semibold text-zinc-255 print:text-zinc-800">{account.name}</span>
                            <span className="block text-[10px] text-zinc-500 font-mono">#{account.id}</span>
                          </div>
                          <span className="font-mono text-zinc-105 print:text-zinc-900 font-bold">{formatCurrency(val)}</span>
                        </div>
                      );
                    })}

                    {accounts.filter(a => a.class === 'Equity').length === 0 && (
                      <div className="text-zinc-500 italic text-[11px] p-2 text-center">No equity accounts found</div>
                    )}

                    {/* Retained Earnings addition via Net Income */}
                    <div className="flex justify-between items-center text-xs py-1.5 text-zinc-500 print:text-zinc-500">
                      <div>
                        <span className="italic pl-1">Current Period Net Profit surplus</span>
                        <span className="block text-[10px] font-mono pl-1">retained metrics</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-350 print:text-zinc-700">{formatCurrency(summary.netIncome)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center font-bold text-xs text-zinc-400 print:text-zinc-600 pt-1.5">
                    <span>Subtotal Shareholder Equity</span>
                    <span className="font-mono">{formatCurrency(summary.finalEquityIncludingNetIncome)}</span>
                  </div>
                </div>

                {/* Combined Liabilities & Equity matching block */}
                <div className="pt-3 border-t-2 border-zinc-800 print:border-zinc-900 flex justify-between items-center font-bold text-xs text-zinc-200 print:text-zinc-900 uppercase tracking-wide bg-zinc-950/20 print:bg-zinc-50 p-3.5 rounded">
                  <span>Liabilities + Shareholders Equity</span>
                  <span className="font-mono text-blue-400 print:text-blue-700 underline decoration-double decoration-2 text-sm">{formatCurrency(summary.totalLiabilities + summary.finalEquityIncludingNetIncome)}</span>
                </div>

              </div>

            </div>

          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-6">
            
            <div className="text-center pb-2 border-b border-zinc-850/60 print:border-zinc-200">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Period-to-date Operation Report</span>
            </div>

            {/* REVENUES Section */}
            <div className="space-y-4">
              <h5 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-850 print:border-zinc-300 pb-1.5 flex justify-between">
                <span>Enterprise Operating Income</span>
                <span>Revenue Accounts</span>
              </h5>
              
              <div className="space-y-1.5 font-sans">
                {accounts.filter(a => a.class === 'Revenue').map(account => {
                  const val = accountBalances[account.id]?.final || 0;
                  return (
                    <div key={account.id} className="flex justify-between items-center text-xs py-1.5 hover:bg-zinc-900/30 px-1 rounded transition-colors">
                      <div>
                        <span className="font-semibold text-zinc-250 print:text-zinc-800">{account.name}</span>
                        <span className="block text-[10px] text-zinc-500 font-mono">#{account.id}</span>
                      </div>
                      <span className="font-mono text-zinc-200 print:text-zinc-900">{formatCurrency(val)}</span>
                    </div>
                  );
                })}
                
                {accounts.filter(a => a.class === 'Revenue').length === 0 && (
                  <div className="text-zinc-500 italic text-[11px] p-2 text-center">No revenue accounts registered</div>
                )}
              </div>
              <div className="flex justify-between font-bold text-xs text-zinc-350 print:text-zinc-800 pt-1.5 border-t border-zinc-900/40">
                <span>Gross Revenue Volume</span>
                <span className="font-mono text-emerald-400 print:text-emerald-700">{formatCurrency(summary.totalRevenue)}</span>
              </div>
            </div>

            {/* EXPENSES Section */}
            <div className="space-y-4 pt-4">
              <h5 className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-850 print:border-zinc-300 pb-1.5 flex justify-between">
                <span>Operating Expenditures &amp; Costs</span>
                <span>Expense Accounts</span>
              </h5>
              
              <div className="space-y-1.5 font-sans">
                {accounts.filter(a => a.class === 'Expense').map(account => {
                  const val = accountBalances[account.id]?.final || 0;
                  return (
                    <div key={account.id} className="flex justify-between items-center text-xs py-1.5 hover:bg-zinc-900/30 px-1 rounded transition-colors">
                      <div>
                        <span className="font-semibold text-zinc-255 print:text-zinc-800">{account.name}</span>
                        <span className="block text-[10px] text-zinc-500 font-mono">#{account.id}</span>
                      </div>
                      <span className="font-mono text-zinc-200 print:text-zinc-900">{formatCurrency(val)}</span>
                    </div>
                  );
                })}
                
                {accounts.filter(a => a.class === 'Expense').length === 0 && (
                  <div className="text-zinc-500 italic text-[11px] p-2 text-center">No expense accounts registered</div>
                )}
              </div>
              <div className="flex justify-between font-bold text-xs text-zinc-350 print:text-zinc-800 pt-1.5 border-t border-zinc-900/40">
                <span>Aggregate Total Expenses</span>
                <span className="font-mono text-red-400 print:text-red-700">({formatCurrency(summary.totalExpenses)})</span>
              </div>
            </div>

            {/* NET INCOME SUMMARY */}
            <div className="pt-4 border-t bg-zinc-950/20 print:bg-zinc-50 p-4 rounded flex justify-between items-center border-zinc-800/80 print:border-zinc-300 font-bold text-xs uppercase tracking-wide">
              <span className="text-zinc-200 print:text-zinc-900">Net Period Surplus Profit (Loss)</span>
              <span className={`font-mono text-base ${summary.netIncome >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-700'}`}>
                {formatCurrency(summary.netIncome)}
              </span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
