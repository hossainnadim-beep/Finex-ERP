/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Account, JournalEntry, UserSession, CompanySettings } from '../types';
import { useCompany } from '../CompanyContext';
import { ReportPeriodPreset, getPresetDateRange } from './reports/reportUtils';
import StandardReportsList, { ReportId } from './reports/StandardReportsList';
import FocusedReportToolbar from './reports/FocusedReportToolbar';

import BalanceSheetReport from './reports/BalanceSheetReport';
import IncomeStatementReport from './reports/IncomeStatementReport';
import CashFlowReport from './reports/CashFlowReport';
import TrialBalanceReport from './reports/TrialBalanceReport';
import GeneralLedgerReport from './reports/GeneralLedgerReport';
import ChangesInEquityReport from './reports/ChangesInEquityReport';
import AgingReport from './reports/AgingReport';
import TransactionReport from './reports/TransactionReport';

export type ReportType = ReportId;

interface ComplianceReportsProps {
  accounts: Account[];
  entries: JournalEntry[];
  session: UserSession | null;
  company?: CompanySettings | null;
}

const REPORT_NAMES: Record<ReportType, string> = {
  balancesheet: 'Balance Sheet Report',
  income: 'Profit and Loss Report',
  cashflow: 'Statement of Cash Flows Report',
  equity: "Statement of Stockholders' Equity Report",
  trialbalance: 'Trial Balance Report',
  generalledger: 'General Ledger Detail Report',
  ar_aging: 'A/R Aging Summary Report',
  ap_aging: 'A/P Aging Summary Report',
  transaction_report: 'Transaction Detail by Account'
};

export default function ComplianceReports({
  accounts,
  entries,
  session,
  company: propCompany
}: ComplianceReportsProps) {
  const { activeCompany: contextCompany } = useCompany();
  const activeCompany = propCompany || contextCompany;

  // By default, open the standard reports list page first!
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [previousReport, setPreviousReport] = useState<ReportType | null>(null);
  const [drillDownAccountId, setDrillDownAccountId] = useState<string | undefined>(undefined);

  const handleDrillDown = (accountId?: string) => {
    setPreviousReport(selectedReport);
    setDrillDownAccountId(accountId);
    setSelectedReport('transaction_report');
  };

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedPreset, setSelectedPreset] = useState<ReportPeriodPreset>('this_year_ytd');
  
  const initialPresetRange = useMemo(() => getPresetDateRange('this_year_ytd'), []);
  const [startDate, setStartDate] = useState<string>(initialPresetRange.startDate);
  const [endDate, setEndDate] = useState<string>(initialPresetRange.endDate);
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);

  // Accounting Basis: Accrual vs Cash
  const defaultBasis = (activeCompany?.accountingMethod === 'Cash') ? 'Cash' : 'Accrual';
  const [accountingBasis, setAccountingBasis] = useState<'Accrual' | 'Cash'>(defaultBasis);

  // Focused Toolbar options
  const [displayColumnsBy, setDisplayColumnsBy] = useState<'total_only' | 'months' | 'quarters' | 'years'>('total_only');
  const [showNonZero, setShowNonZero] = useState<'active' | 'nonzero' | 'all'>('active');
  const [comparePeriod, setComparePeriod] = useState<'none' | 'previous_period' | 'previous_year' | 'percent_change'>('none');
  const [allCollapsed, setAllCollapsed] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'default' | 'name' | 'amount_desc'>('default');
  const [isModernView, setIsModernView] = useState<boolean>(true);

  // Editable titles and custom notes
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [customReportTitle, setCustomReportTitle] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');

  // Options toggles
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const collapseZeroBalances = showNonZero === 'active' || showNonZero === 'nonzero';

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Handle Preset Change
  const handleSelectPreset = (preset: ReportPeriodPreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const range = getPresetDateRange(preset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setAsOfDate(range.endDate);
    }
  };

  // Determine date type: Point-in-time ('as_of') vs Period-of-time ('period')
  const dateType: 'as_of' | 'period' = useMemo(() => {
    if (selectedReport && ['balancesheet', 'trialbalance', 'ar_aging', 'ap_aging'].includes(selectedReport)) {
      return 'as_of';
    }
    return 'period';
  }, [selectedReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleJumpToLast = () => {
    if (reportContainerRef.current) {
      reportContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (!selectedReport) return;
    const companyName = customCompanyName || activeCompany?.legalName || activeCompany?.name || 'Whistling_Wind_Counseling_and_Therapy_Services_Inc';
    const cleanCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanCompany}_${selectedReport}_${dateType === 'as_of' ? asOfDate : `${startDate}_to_${endDate}`}.csv`;

    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `"${companyName}"\r\n`;
    csvContent += `"${selectedReport.toUpperCase()} REPORT"\r\n`;
    csvContent += `"${dateType === 'as_of' ? `As of: ${asOfDate}` : `Period: ${startDate} to ${endDate}`}"\r\n`;
    csvContent += `"Accounting Basis: ${accountingBasis}"\r\n\r\n`;

    if (selectedReport === 'trialbalance') {
      csvContent += `"Account Code","Account Name","Class","Debit","Credit"\r\n`;
      accounts.forEach(acc => {
        csvContent += `"${acc.id}","${acc.name}","${acc.class}",""\r\n`;
      });
    } else {
      csvContent += `"Account / Line Item","Category","Amount"\r\n`;
      accounts.forEach(acc => {
        csvContent += `"${acc.name}","${acc.class}",""\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Synthetic or custom company settings passed down to report headers
  const effectiveCompany: CompanySettings = useMemo(() => {
    const baseName = customCompanyName || activeCompany?.legalName || activeCompany?.name || 'Whistling Wind Counseling and Therapy Services Inc';
    return {
      id: activeCompany?.id || 'default_co',
      name: baseName,
      legalName: baseName,
      taxId: activeCompany?.taxId || '',
      currency: activeCompany?.currency || 'USD',
      currencySymbol: activeCompany?.currencySymbol || '$',
      fiscalYearStartMonth: activeCompany?.fiscalYearStartMonth || 1,
      accountingMethod: accountingBasis,
      address: activeCompany?.address || {
        street: '100 Enterprise Way',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA'
      },
      phone: activeCompany?.phone || '',
      email: activeCompany?.email || '',
      website: activeCompany?.website || '',
      companyType: activeCompany?.companyType || 'Corporation'
    };
  }, [activeCompany, customCompanyName, accountingBasis]);

  // IF NO REPORT IS SELECTED: Show standard reports directory
  if (!selectedReport) {
    return (
      <StandardReportsList
        company={activeCompany || null}
        accounts={accounts}
        entries={entries}
        onSelectReport={(rep) => {
          setSelectedReport(rep);
          setPreviousReport(null);
          setDrillDownAccountId(undefined);
          setCustomReportTitle(''); // Reset any custom title to default for new report
        }}
      />
    );
  }

  // IF TRANSACTION DETAIL REPORT IS SELECTED (Drill-down or direct)
  if (selectedReport === 'transaction_report') {
    return (
      <div className="animate-fade-in">
        <TransactionReport
          company={effectiveCompany}
          accounts={accounts}
          entries={entries}
          initialAccountId={drillDownAccountId}
          startDate={startDate}
          endDate={endDate}
          accountingBasis={accountingBasis}
          previousReportTitle={previousReport ? REPORT_NAMES[previousReport] : 'report list'}
          onBack={() => {
            if (previousReport) {
              setSelectedReport(previousReport);
              setPreviousReport(null);
            } else {
              setSelectedReport(null);
            }
          }}
          currencySymbol={effectiveCompany.currencySymbol}
        />
      </div>
    );
  }

  // FOCUSED SPECIFIC REPORT VIEW
  return (
    <div className="space-y-4">
      
      {/* Focused QuickBooks-style Header & Filter Toolbar */}
      <FocusedReportToolbar
        reportTitle={REPORT_NAMES[selectedReport]}
        onBackToReportsList={() => setSelectedReport(null)}
        dateType={dateType}
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
        asOfDate={asOfDate}
        onChangeAsOfDate={setAsOfDate}
        startDate={startDate}
        onChangeStartDate={setStartDate}
        endDate={endDate}
        onChangeEndDate={setEndDate}
        accountingBasis={accountingBasis}
        onChangeAccountingBasis={setAccountingBasis}
        displayColumnsBy={displayColumnsBy}
        onChangeDisplayColumns={setDisplayColumnsBy}
        showNonZero={showNonZero}
        onChangeShowNonZero={setShowNonZero}
        comparePeriod={comparePeriod}
        onChangeComparePeriod={setComparePeriod}
        onRunReport={() => {
          // Re-trigger calculation
          if (dateType === 'period') {
            setStartDate(s => s);
            setEndDate(e => e);
          } else {
            setAsOfDate(a => a);
          }
        }}
        onPrint={handlePrint}
        onExportCSV={handleExportCSV}
        onJumpToLast={handleJumpToLast}
        allCollapsed={allCollapsed}
        onToggleCollapseAll={() => setAllCollapsed(!allCollapsed)}
        sortOrder={sortOrder}
        onChangeSortOrder={setSortOrder}
        isModernView={isModernView}
        onToggleModernView={() => setIsModernView(!isModernView)}
        customCompanyName={customCompanyName}
        onChangeCustomCompanyName={setCustomCompanyName}
        customReportTitle={customReportTitle}
        onChangeCustomReportTitle={setCustomReportTitle}
        customNotes={customNotes}
        onChangeCustomNotes={setCustomNotes}
      />

      {/* RENDER ACTIVE REPORT SHEET */}
      <div ref={reportContainerRef} className="animate-fade-in">
        {selectedReport === 'balancesheet' && (
          <BalanceSheetReport
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            asOfDate={asOfDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            collapseZeroBalances={collapseZeroBalances}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'income' && (
          <IncomeStatementReport
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            startDate={startDate}
            endDate={endDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            collapseZeroBalances={collapseZeroBalances}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'cashflow' && (
          <CashFlowReport
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            startDate={startDate}
            endDate={endDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'trialbalance' && (
          <TrialBalanceReport
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            asOfDate={asOfDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            collapseZeroBalances={collapseZeroBalances}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'generalledger' && (
          <GeneralLedgerReport
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            startDate={startDate}
            endDate={endDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            collapseZeroBalances={collapseZeroBalances}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'equity' && (
          <ChangesInEquityReport
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            startDate={startDate}
            endDate={endDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'ar_aging' && (
          <AgingReport
            type="ar"
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            asOfDate={asOfDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            onDrillDown={handleDrillDown}
          />
        )}

        {selectedReport === 'ap_aging' && (
          <AgingReport
            type="ap"
            company={effectiveCompany}
            accounts={accounts}
            entries={entries}
            asOfDate={asOfDate}
            accountingBasis={accountingBasis}
            includeNotes={includeNotes}
            includeSignatures={includeSignatures}
            onDrillDown={handleDrillDown}
          />
        )}

        {/* Display Custom Footnotes if entered */}
        {customNotes && (
          <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-700 shadow-xs">
            <span className="font-bold text-slate-900 block mb-1 text-[11px] uppercase tracking-wider">
              Management Notes &amp; Disclosures
            </span>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-600 font-serif">
              {customNotes}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
