/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReportPeriodPreset } from './reportUtils';
import { 
  Printer, 
  Download
} from 'lucide-react';

export interface ReportFiltersProps {
  dateType: 'as_of' | 'period';
  selectedPreset: ReportPeriodPreset;
  onSelectPreset: (preset: ReportPeriodPreset) => void;
  asOfDate: string;
  onChangeAsOfDate: (date: string) => void;
  startDate: string;
  onChangeStartDate: (date: string) => void;
  endDate: string;
  onChangeEndDate: (date: string) => void;
  accountingBasis: 'Accrual' | 'Cash';
  onChangeAccountingBasis: (basis: 'Accrual' | 'Cash') => void;
  onPrint: () => void;
  onExportCSV?: () => void;
  includeSignatures: boolean;
  onToggleSignatures: (val: boolean) => void;
  includeNotes: boolean;
  onToggleNotes: (val: boolean) => void;
  collapseZeroBalances?: boolean;
  onToggleCollapseZero?: (val: boolean) => void;
}

export default function ReportFilters({
  dateType,
  selectedPreset,
  onSelectPreset,
  asOfDate,
  onChangeAsOfDate,
  startDate,
  onChangeStartDate,
  endDate,
  onChangeEndDate,
  accountingBasis,
  onChangeAccountingBasis,
  onPrint,
  onExportCSV,
  includeSignatures,
  onToggleSignatures,
  includeNotes,
  onToggleNotes,
  collapseZeroBalances = false,
  onToggleCollapseZero
}: ReportFiltersProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3 print:hidden select-none text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Period Presets & Date Inputs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          
          {dateType === 'period' ? (
            <>
              {/* Preset Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Period:</span>
                <select
                  value={selectedPreset}
                  onChange={(e) => onSelectPreset(e.target.value as ReportPeriodPreset)}
                  className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1.5 focus:border-blue-600 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year_ytd">This Year-to-Date (YTD)</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_quarter">Last Quarter</option>
                  <option value="last_year">Last Fiscal Year</option>
                  <option value="all_time">All Time (Inception-to-Date)</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    onChangeStartDate(e.target.value);
                    onSelectPreset('custom');
                  }}
                  className="bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    onChangeEndDate(e.target.value);
                    onSelectPreset('custom');
                  }}
                  className="bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* As Of Date Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">As of Date:</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => onChangeAsOfDate(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                />
                <button
                  onClick={() => onChangeAsOfDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  title="Reset to today's date"
                >
                  Today
                </button>
              </div>
            </>
          )}

          {/* Accounting Method Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => onChangeAccountingBasis('Accrual')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                accountingBasis === 'Accrual'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Accrual (GAAP)
            </button>
            <button
              onClick={() => onChangeAccountingBasis('Cash')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                accountingBasis === 'Cash'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cash Basis
            </button>
          </div>

        </div>

        {/* Action Buttons: Print & Export */}
        <div className="flex items-center gap-2">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Export Report to CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={onPrint}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Print GAAP Financial Statement or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>

      </div>

      {/* Secondary Options Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2.5 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => onToggleNotes(e.target.checked)}
              className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="font-medium">Include GAAP Footnotes &amp; Disclosures</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors">
            <input
              type="checkbox"
              checked={includeSignatures}
              onChange={(e) => onToggleSignatures(e.target.checked)}
              className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="font-medium">Include Auditor Signoff Lines</span>
          </label>

          {onToggleCollapseZero && (
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={collapseZeroBalances}
                onChange={(e) => onToggleCollapseZero(e.target.checked)}
                className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-medium">Hide Zero-Balance Accounts</span>
            </label>
          )}
        </div>

        <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
          Format: US GAAP Standard Presentation
        </span>
      </div>

    </div>
  );
}
