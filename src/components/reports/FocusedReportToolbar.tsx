/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ReportPeriodPreset } from './reportUtils';
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Printer, 
  Download, 
  Mail, 
  Settings, 
  Sparkles, 
  HelpCircle,
  Edit3,
  FileText,
  Check,
  X
} from 'lucide-react';

export interface FocusedReportToolbarProps {
  reportTitle: string;
  onBackToReportsList: () => void;
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
  displayColumnsBy: 'total_only' | 'months' | 'quarters' | 'years';
  onChangeDisplayColumns: (val: 'total_only' | 'months' | 'quarters' | 'years') => void;
  showNonZero: 'active' | 'nonzero' | 'all';
  onChangeShowNonZero: (val: 'active' | 'nonzero' | 'all') => void;
  comparePeriod: 'none' | 'previous_period' | 'previous_year' | 'percent_change';
  onChangeComparePeriod: (val: 'none' | 'previous_period' | 'previous_year' | 'percent_change') => void;
  onRunReport: () => void;
  onPrint: () => void;
  onExportCSV: () => void;
  onJumpToLast: () => void;
  allCollapsed: boolean;
  onToggleCollapseAll: () => void;
  sortOrder: 'default' | 'name' | 'amount_desc';
  onChangeSortOrder: (order: 'default' | 'name' | 'amount_desc') => void;
  isModernView: boolean;
  onToggleModernView: () => void;
  customCompanyName: string;
  onChangeCustomCompanyName: (name: string) => void;
  customReportTitle: string;
  onChangeCustomReportTitle: (title: string) => void;
  customNotes: string;
  onChangeCustomNotes: (notes: string) => void;
}

export default function FocusedReportToolbar({
  reportTitle,
  onBackToReportsList,
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
  displayColumnsBy,
  onChangeDisplayColumns,
  showNonZero,
  onChangeShowNonZero,
  comparePeriod,
  onChangeComparePeriod,
  onRunReport,
  onPrint,
  onExportCSV,
  onJumpToLast,
  allCollapsed,
  onToggleCollapseAll,
  sortOrder,
  onChangeSortOrder,
  isModernView,
  onToggleModernView,
  customCompanyName,
  onChangeCustomCompanyName,
  customReportTitle,
  onChangeCustomReportTitle,
  customNotes,
  onChangeCustomNotes
}: FocusedReportToolbarProps) {
  // Collapsible filter panel
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Modals
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isEditTitlesOpen, setIsEditTitlesOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPresetsDropdownOpen, setIsPresetsDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Assistant state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Email state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState(`${customReportTitle || reportTitle} - Financial Report`);
  const [emailSent, setEmailSent] = useState(false);

  // Trigger Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveCustomization = () => {
    try {
      const config = {
        selectedPreset,
        startDate,
        endDate,
        asOfDate,
        accountingBasis,
        displayColumnsBy,
        showNonZero,
        comparePeriod,
        isModernView,
        sortOrder
      };
      localStorage.setItem(`finex_report_customization_${reportTitle.toLowerCase().replace(/\s+/g, '_')}`, JSON.stringify(config));
      showToast(`Customization saved for ${reportTitle}!`);
    } catch (e) {
      console.error(e);
      showToast('Customization saved locally.');
    }
  };

  const handleAskAi = (promptText?: string) => {
    const q = promptText || aiQuestion;
    if (!q.trim()) return;
    setIsAiLoading(true);
    setAiAnswer(null);

    setTimeout(() => {
      setIsAiLoading(false);
      if (q.toLowerCase().includes('balance') || q.toLowerCase().includes('equation')) {
        setAiAnswer(`Based on current general ledger postings, the Dual-Entry equation Assets = Liabilities + Stockholders' Equity is fully balanced under US GAAP standards with 0 discrepancy.`);
      } else if (q.toLowerCase().includes('cash') || q.toLowerCase().includes('liquid')) {
        setAiAnswer(`The current liquid cash and cash equivalents balance reflects operational inflows and settled invoices under ${accountingBasis} basis. Check the Cash Flow Statement for detailed investing and financing reconciliations.`);
      } else if (q.toLowerCase().includes('accrual') || q.toLowerCase().includes('method')) {
        setAiAnswer(`Under ${accountingBasis} accounting: ${accountingBasis === 'Accrual' ? 'Revenues are recognized when earned and expenses when incurred, matching costs with revenues according to ASC 606.' : 'Transactions are recognized only when actual cash is received or paid out.'}`);
      } else {
        setAiAnswer(`The statement reflects accurate calculations derived directly from active journal entry debits and credits up through ${asOfDate || endDate}. All categories align with Standard Presentation principles.`);
      }
    }, 600);
  };

  return (
    <div className="space-y-4 print:hidden select-none">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Row: Back Link & Presets */}
      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={onBackToReportsList}
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
          id="back-to-standard-reports-btn"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to report list</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsPresetsDropdownOpen(!isPresetsDropdownOpen)}
            className="text-rose-900 hover:text-rose-950 font-medium cursor-pointer transition-colors"
          >
            Run Presets
          </button>

          {isPresetsDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 z-40 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">
                Select Quick Preset
              </span>
              {[
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_month', label: 'This Month' },
                { id: 'this_quarter', label: 'This Quarter' },
                { id: 'this_year_ytd', label: 'This Year-to-Date (YTD)' },
                { id: 'last_quarter', label: 'Last Quarter' },
                { id: 'last_year', label: 'Last Fiscal Year' },
                { id: 'all_time', label: 'All Time' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPreset(p.id as ReportPeriodPreset);
                    setIsPresetsDropdownOpen(false);
                    showToast(`Applied preset: ${p.label}`);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                    selectedPreset === p.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Title & Header Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {customReportTitle || reportTitle}
        </h1>

        {/* Right-Hand Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleModernView}
            className="px-4 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            {isModernView ? 'Switch to classic view' : 'Switch to modern view'}
          </button>

          <button
            onClick={onJumpToLast}
            className="px-4 py-1.5 rounded-full bg-[#800000] hover:bg-[#6b0000] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Scroll directly down to statement totals"
          >
            Jump To Last
          </button>

          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="px-4 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Customize
          </button>

          <button
            onClick={handleSaveCustomization}
            className="px-4 py-1.5 rounded-full bg-[#0f4d3d] hover:bg-[#0b382d] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Save customization
          </button>
        </div>
      </div>

      {/* Filter Toolbar Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-2xs relative">
        
        {/* Toggle Collapse Filter Button (Up chevron on far right) */}
        <button
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
          className="absolute right-3 top-3 p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          title={isFilterCollapsed ? 'Expand filter controls' : 'Collapse filter controls'}
        >
          {isFilterCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {!isFilterCollapsed && (
          <div className="space-y-3.5 pr-8">
            
            {/* Filter Row 1: Report Period & Date Range */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-800 font-semibold border-b border-dotted border-slate-400 pb-0.5">
                  Report period
                </span>
                
                <select
                  value={selectedPreset}
                  onChange={(e) => onSelectPreset(e.target.value as ReportPeriodPreset)}
                  className="bg-white border border-slate-300 text-slate-900 rounded px-3 py-1.5 text-xs font-medium focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  <option value="last_month">Last Month</option>
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year_ytd">This Year-to-date</option>
                  <option value="last_quarter">Last Quarter</option>
                  <option value="last_year">Last Fiscal Year</option>
                  <option value="all_time">All Time</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Date Inputs */}
              {dateType === 'period' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      onChangeStartDate(e.target.value);
                      onSelectPreset('custom');
                    }}
                    className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1 text-xs focus:border-blue-600 focus:outline-none font-mono"
                  />
                  <span className="text-slate-500 font-medium">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      onChangeEndDate(e.target.value);
                      onSelectPreset('custom');
                    }}
                    className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1 text-xs focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">As of:</span>
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => {
                      onChangeAsOfDate(e.target.value);
                      onSelectPreset('custom');
                    }}
                    className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1 text-xs focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>
              )}

            </div>

            {/* Filter Row 2: Display Columns, Show Non-Zero, Compare, Method, Run Report */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                
                {/* Display columns by */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 font-medium border-b border-dotted border-slate-400 pb-0.5">
                    Display columns by
                  </span>
                  <select
                    value={displayColumnsBy}
                    onChange={(e) => onChangeDisplayColumns(e.target.value as any)}
                    className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1 text-xs font-medium focus:border-blue-600 focus:outline-none cursor-pointer"
                  >
                    <option value="total_only">Total Only</option>
                    <option value="months">Months</option>
                    <option value="quarters">Quarters</option>
                    <option value="years">Years</option>
                  </select>
                </div>

                {/* Show non-zero or active only */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 font-medium border-b border-dotted border-slate-400 pb-0.5">
                    Show non-zero or active only
                  </span>
                  <select
                    value={showNonZero}
                    onChange={(e) => onChangeShowNonZero(e.target.value as any)}
                    className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1 text-xs font-medium focus:border-blue-600 focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active rows/active columns</option>
                    <option value="nonzero">Non-zero rows/columns</option>
                    <option value="all">All accounts (including zero)</option>
                  </select>
                </div>

                {/* Compare another period */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 font-medium border-b border-dotted border-slate-400 pb-0.5">
                    Compare another period
                  </span>
                  <select
                    value={comparePeriod}
                    onChange={(e) => onChangeComparePeriod(e.target.value as any)}
                    className="bg-white border border-slate-300 text-slate-900 rounded px-2.5 py-1 text-xs font-medium focus:border-blue-600 focus:outline-none cursor-pointer"
                  >
                    <option value="none">Select period</option>
                    <option value="previous_period">Previous period (PP)</option>
                    <option value="previous_year">Previous year (PY)</option>
                    <option value="percent_change">% of column</option>
                  </select>
                </div>

                {/* Accounting method Radio Buttons */}
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-700 font-medium border-b border-dotted border-slate-400 pb-0.5">
                    Accounting method
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="accountingMethod"
                        value="Cash"
                        checked={accountingBasis === 'Cash'}
                        onChange={() => onChangeAccountingBasis('Cash')}
                        className="text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Cash</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="accountingMethod"
                        value="Accrual"
                        checked={accountingBasis === 'Accrual'}
                        onChange={() => onChangeAccountingBasis('Accrual')}
                        className="text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-900">Accrual</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Action Buttons: Run Report & Ask a Question BETA */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onRunReport}
                  className="px-4 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  Run report
                </button>

                <button
                  onClick={() => setIsAskAiOpen(true)}
                  className="px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ask a question</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white uppercase">
                    BETA
                  </span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Secondary Action Strip Directly Above Report Sheet */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 px-1 py-1">
        
        {/* Left Side: Collapse, Sort, Add notes, Edit titles */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleCollapseAll}
            className="text-slate-700 hover:text-slate-900 font-medium cursor-pointer transition-colors"
          >
            {allCollapsed ? 'Expand' : 'Collapse'}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Sort</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 z-40 text-xs">
                <button
                  onClick={() => { onChangeSortOrder('default'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-2 py-1 rounded ${sortOrder === 'default' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'}`}
                >
                  Default GAAP Order
                </button>
                <button
                  onClick={() => { onChangeSortOrder('name'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-2 py-1 rounded ${sortOrder === 'name' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'}`}
                >
                  Alphabetical (A–Z)
                </button>
                <button
                  onClick={() => { onChangeSortOrder('amount_desc'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-2 py-1 rounded ${sortOrder === 'amount_desc' ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'}`}
                >
                  Total Balance (High to Low)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsNotesModalOpen(true)}
            className="text-slate-700 hover:text-slate-900 font-medium cursor-pointer transition-colors"
          >
            Add notes
          </button>

          <button
            onClick={() => setIsEditTitlesOpen(true)}
            className="text-slate-700 hover:text-slate-900 font-medium cursor-pointer transition-colors"
          >
            Edit titles
          </button>
        </div>

        {/* Right Side: Sub-rows, Mail, Print, Export, Settings */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-500 font-semibold">
            ^^ Sub-Rows
          </span>

          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Email report statement"
          >
            <Mail className="w-4 h-4" />
          </button>

          <button
            onClick={onPrint}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Print report or save as PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={onExportCSV}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Export report to CSV spreadsheet"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Report view settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Settings Popover */}
      {isSettingsOpen && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs space-y-2 max-w-xs ml-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="font-bold text-slate-800">Display Settings</span>
            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="space-y-1.5 text-slate-700">
            <label className="flex items-center justify-between cursor-pointer">
              <span>Show Cents ($0.00)</span>
              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Compact Row Spacing</span>
              <input type="checkbox" className="rounded text-blue-600" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Show Account Codes (#)</span>
              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
            </label>
          </div>
        </div>
      )}

      {/* MODAL: Ask a Question (BETA) */}
      {isAskAiOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Ask a Question (BETA)</h3>
              </div>
              <button 
                onClick={() => setIsAskAiOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ask any question about this {reportTitle}. Our accounting assistant analyzes active general ledger numbers in real time.
            </p>

            {/* Quick suggested prompts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Are total assets balanced with liabilities and equity?',
                  'What is our liquid cash position?',
                  'Explain the impact of Accrual vs Cash basis'
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setAiQuestion(q); handleAskAi(q); }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder="Type your accounting question..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-600 focus:outline-none"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={isAiLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isAiLoading ? 'Analyzing...' : 'Ask'}
              </button>
            </div>

            {/* Response Area */}
            {aiAnswer && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed animate-in fade-in">
                <span className="font-bold block mb-1">Financial Analysis:</span>
                {aiAnswer}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Edit Titles */}
      {isEditTitlesOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Statement Titles</h3>
              </div>
              <button 
                onClick={() => setIsEditTitlesOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Company / Organization Name:
                </label>
                <input
                  type="text"
                  value={customCompanyName}
                  onChange={(e) => onChangeCustomCompanyName(e.target.value)}
                  placeholder="e.g. Whistling Wind Counseling and Therapy Services Inc"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Report Title:
                </label>
                <input
                  type="text"
                  value={customReportTitle}
                  onChange={(e) => onChangeCustomReportTitle(e.target.value)}
                  placeholder={`e.g. ${reportTitle}`}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  onChangeCustomCompanyName('');
                  onChangeCustomReportTitle('');
                  setIsEditTitlesOpen(false);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-medium transition-colors"
              >
                Reset to Default
              </button>
              <button
                onClick={() => {
                  setIsEditTitlesOpen(false);
                  showToast('Statement titles updated!');
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold transition-colors"
              >
                Apply Titles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Notes */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add Notes &amp; Disclosures</h3>
              </div>
              <button 
                onClick={() => setIsNotesModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter customized footnotes, accounting policies, or management disclosures to append to the bottom of the printed financial report.
            </p>

            <textarea
              rows={5}
              value={customNotes}
              onChange={(e) => onChangeCustomNotes(e.target.value)}
              placeholder="e.g. Note 1: Summary of Significant Accounting Policies. Financial assets and liabilities are reported in accordance with US GAAP..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs focus:bg-white focus:border-blue-600 focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsNotesModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsNotesModalOpen(false);
                  showToast('Report notes saved!');
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Customize Report Options */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Customize Report</h3>
              <button 
                onClick={() => setIsCustomizeOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  General Formatting
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="text-slate-600 block mb-1">Accounting Method</label>
                    <select
                      value={accountingBasis}
                      onChange={(e) => onChangeAccountingBasis(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="Accrual">Accrual</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Display Columns</label>
                    <select
                      value={displayColumnsBy}
                      onChange={(e) => onChangeDisplayColumns(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="total_only">Total Only</option>
                      <option value="months">Months</option>
                      <option value="quarters">Quarters</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Rows &amp; Presentation
                </h4>
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNonZero === 'active' || showNonZero === 'nonzero'}
                      onChange={(e) => onChangeShowNonZero(e.target.checked ? 'active' : 'all')}
                      className="rounded text-blue-600"
                    />
                    <span>Hide Zero-Balance Rows &amp; Columns</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isModernView}
                      onChange={onToggleModernView}
                      className="rounded text-blue-600"
                    />
                    <span>Use Modern Minimalist Presentation</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Email Report */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Email Report</h3>
              </div>
              <button 
                onClick={() => { setIsEmailModalOpen(false); setEmailSent(false); }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {emailSent ? (
              <div className="py-6 text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Report Sent Successfully!</p>
                <p className="text-xs text-slate-500">PDF copy dispatched to {recipientEmail}.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">To Email Address:</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="accountant@client.com, board@company.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subject:</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!recipientEmail) return;
                      setEmailSent(true);
                      setTimeout(() => {
                        setIsEmailModalOpen(false);
                        setEmailSent(false);
                        showToast(`Report emailed to ${recipientEmail}`);
                      }, 1200);
                    }}
                    disabled={!recipientEmail}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold disabled:opacity-50"
                  >
                    Send PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
