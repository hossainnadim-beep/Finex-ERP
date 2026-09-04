/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanySettings } from '../../types';
import { formatAccountingDate } from './reportUtils';
import { Building2, ShieldCheck, Calendar, DollarSign } from 'lucide-react';

export interface ReportHeaderProps {
  company: CompanySettings | null;
  reportTitle: string;
  reportSubtitle?: string;
  dateType: 'as_of' | 'period';
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  accountingBasis?: 'Accrual' | 'Cash';
  currencyCode?: string;
  currencySymbol?: string;
  customCompanyName?: string;
  customReportTitle?: string;
  modernView?: boolean;
}

export default function ReportHeader({
  company,
  reportTitle,
  reportSubtitle,
  dateType,
  asOfDate,
  startDate,
  endDate,
  accountingBasis = 'Accrual',
  currencyCode = 'USD',
  currencySymbol = '$',
  customCompanyName,
  customReportTitle,
  modernView = true
}: ReportHeaderProps) {
  const companyName = customCompanyName || company?.legalName || company?.name || 'Whistling Wind Counseling and Therapy Services Inc';
  const displayTitle = customReportTitle || reportTitle;
  const taxId = company?.taxId;
  const address = company?.address;

  // Format standard GAAP date line
  let dateLine = '';
  if (dateType === 'as_of') {
    dateLine = `As of ${formatAccountingDate(asOfDate || new Date().toISOString().split('T')[0])}`;
  } else {
    const startStr = formatAccountingDate(startDate || '2026-01-01');
    const endStr = formatAccountingDate(endDate || new Date().toISOString().split('T')[0]);
    dateLine = `For the Period ${startStr} to ${endStr}`;
  }

  if (modernView) {
    return (
      <div className="text-center py-6 px-4 border-b border-slate-200 bg-white rounded-t-lg select-none">
        <h1 
          className="text-xl sm:text-2xl font-serif text-slate-900 tracking-tight"
          id="report-company-name-header"
        >
          {companyName}
        </h1>
        <h2 
          className="text-base sm:text-lg font-sans font-medium text-slate-800 mt-1"
          id="report-title-header"
        >
          {displayTitle}
        </h2>
        <div 
          className="text-xs text-slate-600 mt-1 font-sans"
          id="report-date-header"
        >
          {dateLine}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-6 px-4 border-b border-slate-200 bg-slate-50/50 rounded-t-lg select-none">
      
      {/* GAAP Standard Line 1: Corporate Legal Entity Name */}
      <div className="flex items-center justify-center gap-2 mb-1.5">
        <Building2 className="w-5 h-5 text-blue-600 print:text-zinc-800 shrink-0" />
        <h1 
          className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 print:text-zinc-900 font-serif"
          id="report-company-name-header"
        >
          {companyName}
        </h1>
      </div>

      {/* Optional Company Sub-details (Tax ID / City, State) */}
      {(taxId || (address?.city && address?.state)) && (
        <div className="text-[11px] text-slate-500 mb-2 font-mono flex items-center justify-center gap-3">
          {address?.city && address?.state && (
            <span>{address.city}, {address.state}</span>
          )}
          {taxId && (
            <span>• EIN / Tax ID: {taxId}</span>
          )}
          {company?.companyType && (
            <span>• {company.companyType}</span>
          )}
        </div>
      )}

      {/* GAAP Standard Line 2: Financial Statement Name / Report Title */}
      <h2 
        className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 print:text-zinc-800 mt-1.5 font-sans"
        id="report-title-header"
      >
        {reportTitle}
      </h2>

      {reportSubtitle && (
        <p className="text-xs text-slate-600 font-medium mt-0.5">
          {reportSubtitle}
        </p>
      )}

      {/* GAAP Standard Line 3: Reporting Date / Accounting Period Specification */}
      <div 
        className="text-sm font-semibold text-slate-800 print:text-zinc-900 mt-2 font-sans flex items-center justify-center gap-1.5"
        id="report-date-header"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500 print:hidden" />
        <span>{dateLine}</span>
      </div>

      {/* GAAP Standard Metadata Sub-bar: Currency, Basis, & Presentation Standards */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 pt-2.5 border-t border-slate-200 text-[11px] font-mono text-slate-600">
        <span className="flex items-center gap-1 text-slate-700">
          <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
          <span>Amounts in {currencyCode} ({currencySymbol})</span>
        </span>
        <span className="hidden sm:inline text-slate-300">•</span>
        <span className="text-slate-700">
          Basis of Accounting: <strong className="text-slate-900 font-semibold">{accountingBasis} Basis</strong>
        </span>
        <span className="hidden sm:inline text-slate-300">•</span>
        <span className="flex items-center gap-1 text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          <span>US GAAP Standard</span>
        </span>
        <span className="hidden sm:inline text-slate-300">•</span>
        <span className="italic text-slate-500">Unaudited — For Management Use Only</span>
      </div>

    </div>
  );
}
