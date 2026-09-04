/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CompanySettings, Account, JournalEntry } from '../../types';
import { 
  Scale, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  FileText, 
  BookOpen, 
  Users, 
  Building, 
  Search, 
  Star, 
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export type ReportId = 
  | 'balancesheet'
  | 'income'
  | 'cashflow'
  | 'equity'
  | 'trialbalance'
  | 'generalledger'
  | 'transaction_report'
  | 'ar_aging'
  | 'ap_aging';

export interface ReportItem {
  id: ReportId;
  name: string;
  category: 'financial' | 'bookkeeping' | 'receivables' | 'payables';
  categoryLabel: string;
  subtext: string;
  description: string;
  frequency: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ALL_STANDARD_REPORTS: ReportItem[] = [
  {
    id: 'balancesheet',
    name: 'Balance Sheet Report',
    category: 'financial',
    categoryLabel: 'Financial Statements',
    subtext: 'Statement of Financial Position',
    description: 'Summary of what your company owns (assets), what you owe (liabilities), and the net book value invested (equity) as of a specific point in time.',
    frequency: 'As of Date',
    icon: Scale
  },
  {
    id: 'income',
    name: 'Profit and Loss Report',
    category: 'financial',
    categoryLabel: 'Financial Statements',
    subtext: 'Income Statement / Statement of Operations',
    description: 'Itemizes operating revenues, cost of goods sold, operating expenses, and net profit or loss over a defined accounting period.',
    frequency: 'Monthly / Quarterly / YTD',
    icon: TrendingUp
  },
  {
    id: 'cashflow',
    name: 'Statement of Cash Flows Report',
    category: 'financial',
    categoryLabel: 'Financial Statements',
    subtext: 'Cash from Operations, Investing & Financing (ASC 230)',
    description: 'Tracks actual liquid cash entering and exiting your company, reconciling starting and ending cash with net operating income.',
    frequency: 'Period of Time',
    icon: BarChart3
  },
  {
    id: 'equity',
    name: "Statement of Stockholders' Equity Report",
    category: 'financial',
    categoryLabel: 'Financial Statements',
    subtext: 'Changes in Share Capital & Retained Earnings',
    description: 'Multi-column statement reconciling changes in common stock, additional paid-in capital, dividends, and accumulated retained earnings.',
    frequency: 'Fiscal Period',
    icon: PieChart
  },
  {
    id: 'trialbalance',
    name: 'Trial Balance Report',
    category: 'bookkeeping',
    categoryLabel: 'Accountant & Bookkeeping',
    subtext: 'Debit and Credit Equivalence Verification',
    description: 'Summarizes ending debit and credit balances for every account in the chart of accounts, verifying that Total Debits equal Total Credits.',
    frequency: 'As of Date',
    icon: FileText
  },
  {
    id: 'generalledger',
    name: 'General Ledger Detail Report',
    category: 'bookkeeping',
    categoryLabel: 'Accountant & Bookkeeping',
    subtext: 'Itemized Posting Audit Trail by Account',
    description: 'Complete chronological audit log of every debit, credit, transaction memo, and running balance posted across all accounts.',
    frequency: 'Period Detail',
    icon: BookOpen
  },
  {
    id: 'transaction_report',
    name: 'Transaction Report (Drill-Down Detail)',
    category: 'bookkeeping',
    categoryLabel: 'Accountant & Bookkeeping',
    subtext: 'Account QuickZoom & Transaction Breakdown',
    description: 'Drill down into individual account transactions, including beginning balance, splits, transaction types, payees, and running balances.',
    frequency: 'Custom Period',
    icon: FileText
  },
  {
    id: 'ar_aging',
    name: 'A/R Aging Summary Report',
    category: 'receivables',
    categoryLabel: 'Who Owes You (Receivables)',
    subtext: 'Customer Unpaid Receivables & Aging Buckets',
    description: 'Categorizes outstanding invoices by days past due (Current, 1–30, 31–60, 61–90, >90 days) to track collections and cash flow.',
    frequency: 'As of Date',
    icon: Users
  },
  {
    id: 'ap_aging',
    name: 'A/P Aging Summary Report',
    category: 'payables',
    categoryLabel: 'What You Owe (Payables)',
    subtext: 'Outstanding Vendor Obligations by Days Past Due',
    description: 'Tracks unpaid vendor bills and trade liabilities grouped by payment terms to ensure prompt settlement and manage working capital.',
    frequency: 'As of Date',
    icon: Building
  }
];

interface StandardReportsListProps {
  company: CompanySettings | null;
  accounts: Account[];
  entries: JournalEntry[];
  onSelectReport: (reportId: ReportId) => void;
}

export default function StandardReportsList({
  company,
  accounts,
  entries,
  onSelectReport
}: StandardReportsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('finex_favorite_reports');
      return saved ? JSON.parse(saved) : ['balancesheet', 'income', 'trialbalance'];
    } catch {
      return ['balancesheet', 'income', 'trialbalance'];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('finex_favorite_reports', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save favorite reports:', err);
      }
      return next;
    });
  };

  const filteredReports = useMemo(() => {
    return ALL_STANDARD_REPORTS.filter(rep => {
      const matchesSearch = 
        rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.subtext.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'favorites') {
        return favorites.includes(rep.id);
      }
      if (activeCategory === 'all') return true;
      return rep.category === activeCategory;
    });
  }, [searchTerm, activeCategory, favorites]);

  // Group filtered reports by category
  const categories = [
    { key: 'financial', title: 'Business Overview & Financial Statements' },
    { key: 'bookkeeping', title: 'Accountant & Bookkeeping Reports' },
    { key: 'receivables', title: 'Who Owes You (Accounts Receivable)' },
    { key: 'payables', title: 'What You Owe (Accounts Payable)' }
  ];

  const companyLegalName = company?.legalName || company?.name || 'Finex Global Enterprises Inc.';

  return (
    <div className="space-y-6 text-slate-900 animate-fade-in select-none">
      
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Standard Reports
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                GAAP &amp; IFRS Compliant
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Select a financial statement or ledger audit to view, customize period dates, filter accounts, and export official reports.
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Reporting Entity: <strong className="text-slate-800 font-semibold">{companyLegalName}</strong></span>
              <span>•</span>
              <span>Currency: <strong className="text-slate-800 font-semibold">{company?.currency || 'USD'} ({company?.currencySymbol || '$'})</strong></span>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find report by name or keyword..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-2 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-slate-100 text-xs">
          {[
            { id: 'all', label: 'All Reports' },
            { id: 'favorites', label: `Favorites (${favorites.length})` },
            { id: 'financial', label: 'Financial Statements' },
            { id: 'bookkeeping', label: 'Bookkeeping & Audit' },
            { id: 'receivables', label: 'Who Owes You' },
            { id: 'payables', label: 'What You Owe' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Listing by Section */}
      <div className="space-y-6">
        {categories.map(cat => {
          const categoryReports = filteredReports.filter(r => r.category === cat.key);
          if (categoryReports.length === 0) return null;

          return (
            <div key={cat.key} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {cat.title}
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  {categoryReports.length} {categoryReports.length === 1 ? 'report' : 'reports'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {categoryReports.map(rep => {
                  const Icon = rep.icon;
                  const isFav = favorites.includes(rep.id);

                  return (
                    <div
                      key={rep.id}
                      onClick={() => onSelectReport(rep.id)}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-lg p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between text-left"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Icon className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                <span>{rep.name}</span>
                              </h3>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {rep.subtext}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(e, rep.id)}
                            className="p-1 rounded text-slate-300 hover:text-amber-500 hover:bg-slate-50 transition-colors"
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                          {rep.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-mono text-slate-500">
                          {rep.frequency}
                        </span>
                        <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                          <span>Run report</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">No matching reports found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or switching to &ldquo;All Reports&rdquo;.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
              className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
