/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Account, JournalEntry, AuditLog } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  FileSpreadsheet, 
  ShieldCheck, 
  HelpCircle, 
  ArrowUpRight, 
  History, 
  Layers,
  CheckCircle,
  Database,
  Calendar
} from 'lucide-react';

interface DashboardOverviewProps {
  entries: JournalEntry[];
  accounts: Account[];
  auditLogs: AuditLog[];
  onNavigate: (tab: 'dashboard' | 'accounts' | 'journal' | 'reports' | 'settings') => void;
  isDbConnected: boolean;
}

export default function DashboardOverview({ 
  entries, 
  accounts, 
  auditLogs, 
  onNavigate,
  isDbConnected 
}: DashboardOverviewProps) {

  // Dynamic balance calculations for simple dashboard metrics
  const summary = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => {
      balances[acc.id] = 0;
    });

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (balances[line.accountId] === undefined) {
          balances[line.accountId] = 0;
        }
        if (accounts.find(a => a.id === line.accountId)?.normalBalance === 'Debit') {
          balances[line.accountId] += (line.debit - line.credit);
        } else {
          balances[line.accountId] += (line.credit - line.debit);
        }
      });
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    accounts.forEach(acc => {
      const bal = balances[acc.id] || 0;
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
    const finalEquity = totalEquity + netIncome;
    const equationBalanced = Math.abs(totalAssets - (totalLiabilities + finalEquity)) === 0;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity: finalEquity,
      totalRevenue,
      totalExpenses,
      netIncome,
      equationBalanced,
      totalVouchersCount: entries.length
    };
  }, [entries, accounts]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Safe percentage helper
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
  };

  const assetPercentage = getPercentage(summary.totalAssets, (summary.totalAssets + summary.totalLiabilities + summary.totalEquity));
  const liabilityPercentage = getPercentage(summary.totalLiabilities, (summary.totalAssets + summary.totalLiabilities + summary.totalEquity));
  const equityPercentage = getPercentage(summary.totalEquity, (summary.totalAssets + summary.totalLiabilities + summary.totalEquity));

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/15 via-zinc-900 to-zinc-900 p-6 rounded border border-zinc-800/80 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Finex ERP Control Command Center</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Real-time Sarbanes-Oxley cryptographic compliance monitoring, dynamic ledger balances, and immutable accounting log registries.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300">
            {isDbConnected ? 'Supabase Secure DB Link Active' : 'Sandbox (Local Persistence)'}
          </span>
        </div>
      </div>

      {/* Dynamic KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Assets Card */}
        <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total Operations Assets</span>
              <div className="text-xl font-bold text-zinc-100 font-mono mt-1.5">{formatCurrency(summary.totalAssets)}</div>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[9px] text-zinc-500 mt-3 font-mono">Debit Normal Balance Volume</div>
        </div>

        {/* Total Liabilities Card */}
        <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Outstanding Liabilities</span>
              <div className="text-xl font-bold text-zinc-100 font-mono mt-1.5">{formatCurrency(summary.totalLiabilities)}</div>
            </div>
            <div className="p-2 bg-red-500/10 text-red-400 rounded border border-red-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[9px] text-zinc-500 mt-3 font-mono">Unpaid Vendor Obligations</div>
        </div>

        {/* Dynamic Net Income Card */}
        <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Net Operations Income</span>
              <div className={`text-xl font-bold font-mono mt-1.5 ${summary.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.netIncome)}
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[9px] text-zinc-500 mt-3 font-mono">Revenues - Current Operating Expenses</div>
        </div>

        {/* Compliance Balance Shield */}
        <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">compliance status</span>
              <div className={`text-xs font-bold mt-2 truncate font-mono uppercase tracking-wide flex items-center gap-1.5 ${
                summary.equationBalanced ? 'text-blue-400' : 'text-amber-400'
              }`}>
                {summary.equationBalanced ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                    <span>Balanced Ledger</span>
                  </>
                ) : (
                  <span>Delta Out-of-Balance</span>
                )}
              </div>
            </div>
            <div className={`p-2 rounded border ${
              summary.equationBalanced 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                : 'bg-amber-500/10 text-amber-405 border-amber-500/20'
            }`}>
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-[9px] text-zinc-500 mt-3 font-mono uppercase tracking-wider">
            {summary.equationBalanced ? 'Double-entry constraints compliant' : 'Investigate vouchers difference'}
          </div>
        </div>

      </div>

      {/* Main Grid: Data Visualization & Quick Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Charts: Asset & Liability Distribution (Pure-CSS High-Quality visualization) */}
        <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-sm lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" /> Capital Structure & Assets Breakdown
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1 uppercase font-mono">Percentage volumes of balanced accounting equation</p>
          </div>

          <div className="space-y-4 my-4">
            
            {/* Visual stacked ledger progress line */}
            <div className="space-y-1.5Packed font-sans">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Asset Coverage vs. Claims</span>
                <span>{assetPercentage}% Assets</span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded overflow-hidden flex border border-zinc-800">
                <div style={{ width: `${Math.max(10, assetPercentage)}%` }} className="bg-blue-600 h-full transition-all duration-500" title="Assets percentage of aggregate ledger" />
                <div style={{ width: `${Math.max(5, liabilityPercentage)}%` }} className="bg-amber-500 h-full transition-all duration-500" title="Claims (Liabilities) percentage" />
                <div style={{ width: `${Math.max(5, equityPercentage)}%` }} className="bg-emerald-600 h-full transition-all duration-500" title="Shareholder Equity percentage" />
              </div>
            </div>

            {/* Structured Ratio Rows */}
            <div className="grid grid-cols-3 gap-4 pt-3 text-center border-t border-zinc-850">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>Assets</span>
                </div>
                <div className="text-xs font-mono font-bold text-zinc-200">{formatCurrency(summary.totalAssets)}</div>
                <div className="text-[9px] text-zinc-500 font-mono">Ratio {assetPercentage}%</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-550" />
                  <span>Liabilities</span>
                </div>
                <div className="text-xs font-mono font-bold text-zinc-200">{formatCurrency(summary.totalLiabilities)}</div>
                <div className="text-[9px] text-zinc-500 font-mono">Ratio {liabilityPercentage}%</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Equity</span>
                </div>
                <div className="text-xs font-mono font-bold text-zinc-200">{formatCurrency(summary.totalEquity)}</div>
                <div className="text-[9px] text-zinc-500 font-mono">Ratio {equityPercentage}%</div>
              </div>
            </div>

          </div>

          <div className="p-3 bg-zinc-950/45 border border-zinc-850 rounded text-xs text-zinc-400 leading-relaxed font-sans mt-2">
            The fundamental accounting equation states that <strong>Assets = Liabilities + Equity</strong>. Every transactional entry must have credit and debit totals equal to satisfy this equation dynamically.
          </div>
        </div>

        {/* Quick Workflows / Shortcut Cards */}
        <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-4">
              <ArrowUpRight className="h-4 w-4 text-blue-400" /> ERP Quick Operations
            </h3>
            
            <div className="space-y-2.5 font-sans">
              
              <button
                onClick={() => onNavigate('journal')}
                className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-70s rounded text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 group-hover:bg-blue-500/20">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-zinc-200">Post Journal Entry</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">Record double-entry values</span>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-550 group-hover:text-zinc-200 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('accounts')}
                className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-70s rounded text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 group-hover:bg-emerald-500/20">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-zinc-200">Chart Of Accounts</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">Fetch baseline database structures</span>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-550 group-hover:text-zinc-200 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('reports')}
                className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-70s rounded text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20 group-hover:bg-purple-500/20">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-zinc-200">Generate Statements</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">Corporate balance sheet audit reports</span>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-550 group-hover:text-zinc-200 transition-colors" />
              </button>

            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Posted Vouchers</span>
            <span className="text-zinc-300 font-bold">{summary.totalVouchersCount} permanent records</span>
          </div>
        </div>

      </div>

      {/* Security Audit Trail Activity Feed */}
      <div className="bg-[#121214] rounded border border-zinc-800 shadow-sm overflow-hidden" id="dashboard-compliance-log">
        <div className="bg-[#09090b] px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-500" /> Dynamic Compliance Audit Security Registry
          </h3>
          <span className="text-[10px] font-mono text-zinc-505 uppercase tracking-widest font-semibold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            SECURE LEDGER ACTIVE
          </span>
        </div>
        
        <div className="divide-y divide-zinc-850/60 max-h-56 overflow-y-auto">
          {auditLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="p-3.5 text-xs hover:bg-zinc-900/30 transition-all flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="mt-0.5 px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[9px] font-mono border border-zinc-800 whitespace-nowrap">
                  {log.action}
                </span>
                <div>
                  <p className="text-zinc-300 leading-relaxed font-sans">{log.details}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Actor: <span className="text-zinc-400">{log.actor}</span> | Timestamp: {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono font-semibold whitespace-nowrap">
                {log.id}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
