/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Users, 
  Sliders, 
  ShieldCheck, 
  DollarSign, 
  Lock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Download, 
  UploadCloud, 
  Scale, 
  PieChart, 
  RefreshCw, 
  HelpCircle,
  FileSpreadsheet,
  Shuffle,
  Mail,
  Phone,
  Globe,
  Tag,
  Check
} from 'lucide-react';
import { useCompany } from '../CompanyContext';
import { CompanySettings, CompanyUser, UserRole, Account, JournalEntry } from '../types';
import { QboMenuKey } from './QboSettingsMegaMenu';

interface CompanySettingsModalProps {
  initialKey: QboMenuKey;
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  journalEntries: JournalEntry[];
  onImportAccounts?: (newAccounts: Account[]) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar ($)' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar ($)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar ($)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (৳)' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (د.إ)' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal (﷼)' },
];

export default function CompanySettingsModal({
  initialKey,
  isOpen,
  onClose,
  accounts,
  journalEntries,
  onImportAccounts
}: CompanySettingsModalProps) {
  const { 
    activeCompany, 
    companies, 
    updateCompany, 
    createCompany, 
    setActiveCompanyId,
    companyUsers,
    addCompanyUser,
    updateCompanyUserRole,
    removeCompanyUser,
    products,
    addProduct,
    deleteProduct,
    recurringTransactions,
    addRecurringTransaction,
    toggleRecurringTransaction,
    reconciliations,
    addReconciliation,
    budgets,
    saveBudget
  } = useCompany();

  // Active section
  const [activeSection, setActiveSection] = useState<QboMenuKey>(initialKey);

  // Account & Settings internal tab
  const [settingsTab, setSettingsTab] = useState<'company' | 'sales' | 'expenses' | 'advanced'>('company');

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Company details form state
  const [companyName, setCompanyName] = useState(activeCompany?.name || '');
  const [legalName, setLegalName] = useState(activeCompany?.legalName || '');
  const [taxId, setTaxId] = useState(activeCompany?.taxId || '');
  const [industry, setIndustry] = useState(activeCompany?.industry || '');
  const [companyType, setCompanyType] = useState(activeCompany?.companyType || 'Corporation');
  const [email, setEmail] = useState(activeCompany?.email || '');
  const [phone, setPhone] = useState(activeCompany?.phone || '');
  const [website, setWebsite] = useState(activeCompany?.website || '');
  const [currency, setCurrency] = useState(activeCompany?.currency || 'USD');
  const [currencySymbol, setCurrencySymbol] = useState(activeCompany?.currencySymbol || '$');
  
  // Addresses
  const [street, setStreet] = useState(activeCompany?.address?.street || '');
  const [city, setCity] = useState(activeCompany?.address?.city || '');
  const [state, setState] = useState(activeCompany?.address?.state || '');
  const [zip, setZip] = useState(activeCompany?.address?.zip || '');
  const [country, setCountry] = useState(activeCompany?.address?.country || 'United States');

  // Advanced Accounting Rules
  const [fiscalYearMonth, setFiscalYearMonth] = useState(activeCompany?.fiscalYearStartMonth || 1);
  const [taxYearMonth, setTaxYearMonth] = useState(activeCompany?.taxYearStartMonth || 1);
  const [accountingMethod, setAccountingMethod] = useState<'Accrual' | 'Cash'>(activeCompany?.accountingMethod || 'Accrual');
  const [closeBooks, setCloseBooks] = useState(activeCompany?.closeBooks || false);
  const [closingDate, setClosingDate] = useState(activeCompany?.closingDate || '');
  const [closingPassword, setClosingPassword] = useState(activeCompany?.closingPassword || '');

  // Sales & Invoicing defaults
  const [defaultTerms, setDefaultTerms] = useState(activeCompany?.defaultInvoiceTerms || 'Net 30');
  const [defaultSalesMessage, setDefaultSalesMessage] = useState(activeCompany?.defaultSalesMessage || 'Thank you for your business!');

  // New user invite form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Standard');

  // New company creation wizard state
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompLegalName, setNewCompLegalName] = useState('');
  const [newCompIndustry, setNewCompIndustry] = useState('Technology & SaaS');
  const [newCompCurrency, setNewCompCurrency] = useState('USD');
  const [newCompFiscalMonth, setNewCompFiscalMonth] = useState(1);
  const [newCompStreet, setNewCompStreet] = useState('');
  const [newCompCity, setNewCompCity] = useState('');
  const [newCompState, setNewCompState] = useState('');
  const [newCompZip, setNewCompZip] = useState('');

  // Reconcile tool state
  const [reconAccountId, setReconAccountId] = useState('1010');
  const [reconStatementDate, setReconStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconEndingBalance, setReconEndingBalance] = useState('150000.00');
  const [clearedEntryIds, setClearedEntryIds] = useState<Record<string, boolean>>({});

  // Budgeting tool state
  const [selectedBudgetAccount, setSelectedBudgetAccount] = useState('4000');
  const [budgetFiscalYear, setBudgetFiscalYear] = useState(new Date().getFullYear());
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('10000');

  // Reclassify tool state
  const [reclassifyFromAccount, setReclassifyFromAccount] = useState('5010');
  const [reclassifyToAccount, setReclassifyToAccount] = useState('5020');

  // Keep state in sync when activeCompany changes
  React.useEffect(() => {
    if (activeCompany) {
      setCompanyName(activeCompany.name || '');
      setLegalName(activeCompany.legalName || '');
      setTaxId(activeCompany.taxId || '');
      setIndustry(activeCompany.industry || '');
      setCompanyType(activeCompany.companyType || 'Corporation');
      setEmail(activeCompany.email || '');
      setPhone(activeCompany.phone || '');
      setWebsite(activeCompany.website || '');
      setCurrency(activeCompany.currency || 'USD');
      setCurrencySymbol(activeCompany.currencySymbol || '$');
      setStreet(activeCompany.address?.street || '');
      setCity(activeCompany.address?.city || '');
      setState(activeCompany.address?.state || '');
      setZip(activeCompany.address?.zip || '');
      setCountry(activeCompany.address?.country || 'United States');
      setFiscalYearMonth(activeCompany.fiscalYearStartMonth || 1);
      setTaxYearMonth(activeCompany.taxYearStartMonth || 1);
      setAccountingMethod(activeCompany.accountingMethod || 'Accrual');
      setCloseBooks(activeCompany.closeBooks || false);
      setClosingDate(activeCompany.closingDate || '');
      setClosingPassword(activeCompany.closingPassword || '');
      setDefaultTerms(activeCompany.defaultInvoiceTerms || 'Net 30');
      setDefaultSalesMessage(activeCompany.defaultSalesMessage || 'Thank you for your business!');
    }
  }, [activeCompany]);

  if (!isOpen || !activeCompany) return null;

  // Save Company settings changes
  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Company Name is required.');
      return;
    }

    const cur = CURRENCIES.find(c => c.code === currency);

    updateCompany(activeCompany.id, {
      name: companyName.trim(),
      legalName: legalName.trim() || companyName.trim(),
      taxId: taxId.trim(),
      industry: industry.trim(),
      companyType,
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim(),
      currency,
      currencySymbol: cur?.symbol || '$',
      address: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim()
      },
      legalAddress: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim()
      },
      customerFacingAddress: {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim()
      },
      fiscalYearStartMonth: Number(fiscalYearMonth),
      taxYearStartMonth: Number(taxYearMonth),
      accountingMethod,
      closeBooks,
      closingDate: closeBooks ? closingDate : null,
      closingPassword: closeBooks ? closingPassword : '',
      defaultInvoiceTerms: defaultTerms,
      defaultSalesMessage
    });

    showToast('Company settings successfully updated and saved.');
  };

  // Add new user to company
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim()) {
      alert('Please enter both name and corporate email.');
      return;
    }
    addCompanyUser({
      companyId: activeCompany.id,
      userId: `usr_invited_${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: 'Invited'
    });
    setNewUserName('');
    setNewUserEmail('');
    showToast(`Invitation sent to ${newUserEmail} as ${newUserRole}.`);
  };

  // Create new company wizard
  const handleCreateNewCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) {
      alert('Company Name is required.');
      return;
    }

    const cur = CURRENCIES.find(c => c.code === newCompCurrency);

    const created = createCompany({
      name: newCompName.trim(),
      legalName: newCompLegalName.trim() || newCompName.trim(),
      taxId: '12-3456789',
      industry: newCompIndustry,
      companyType: 'Corporation',
      email: activeCompany.email,
      phone: activeCompany.phone,
      website: '',
      currency: newCompCurrency,
      currencySymbol: cur?.symbol || '$',
      address: {
        street: newCompStreet.trim() || '100 Business Center Blvd',
        city: newCompCity.trim() || 'San Francisco',
        state: newCompState.trim() || 'CA',
        zip: newCompZip.trim() || '94105',
        country: 'United States'
      },
      legalAddress: {
        street: newCompStreet.trim() || '100 Business Center Blvd',
        city: newCompCity.trim() || 'San Francisco',
        state: newCompState.trim() || 'CA',
        zip: newCompZip.trim() || '94105',
        country: 'United States'
      },
      customerFacingAddress: {
        street: newCompStreet.trim() || '100 Business Center Blvd',
        city: newCompCity.trim() || 'San Francisco',
        state: newCompState.trim() || 'CA',
        zip: newCompZip.trim() || '94105',
        country: 'United States'
      },
      fiscalYearStartMonth: Number(newCompFiscalMonth),
      taxYearStartMonth: Number(newCompFiscalMonth),
      accountingMethod: 'Accrual',
      closeBooks: false,
      closingDate: null,
      closingPassword: '',
      defaultInvoiceTerms: 'Net 30',
      defaultSalesMessage: 'Thank you for your business!',
      ownerUserId: activeCompany.ownerUserId
    });

    setIsCreatingCompany(false);
    showToast(`Company "${created.name}" created successfully!`);
  };

  // Export company ledger data to CSV/JSON
  const handleExportData = (format: 'csv' | 'json') => {
    const dataToExport = {
      company: activeCompany,
      accounts: accounts.filter(a => !a.companyId || a.companyId === activeCompany.id),
      journalEntries: journalEntries.filter(je => !je.companyId || je.companyId === activeCompany.id),
      exportedAt: new Date().toISOString()
    };

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      filename = `${activeCompany.name.replace(/\s+/g, '_')}_Ledger_Backup.json`;
    } else {
      // CSV General Ledger
      let csvContent = 'Date,Reference,Account ID,Account Name,Description,Debit ($),Credit ($)\n';
      dataToExport.journalEntries.forEach(entry => {
        entry.lines.forEach(line => {
          const acct = dataToExport.accounts.find(a => a.id === line.accountId);
          csvContent += `"${entry.date}","${entry.reference}","${line.accountId}","${acct?.name || ''}","${entry.description}",${(line.debit / 100).toFixed(2)},${(line.credit / 100).toFixed(2)}\n`;
        });
      });
      blob = new Blob([csvContent], { type: 'text/csv' });
      filename = `${activeCompany.name.replace(/\s+/g, '_')}_General_Ledger.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename} successfully!`);
  };

  // Reconcile logic
  const reconAccount = accounts.find(a => a.id === reconAccountId);
  const relevantEntries = journalEntries.filter(je => 
    (!je.companyId || je.companyId === activeCompany.id) &&
    je.lines.some(l => l.accountId === reconAccountId)
  );

  const clearedCents = relevantEntries.reduce((sum, entry) => {
    if (!clearedEntryIds[entry.id]) return sum;
    const line = entry.lines.find(l => l.accountId === reconAccountId);
    if (!line) return sum;
    // For asset (debit normal), debit increases balance, credit decreases
    return sum + (line.debit - line.credit);
  }, 0);

  const statementEndingCents = Math.round(parseFloat(reconEndingBalance || '0') * 100);
  const reconDifferenceCents = statementEndingCents - clearedCents;

  const handleFinishReconciliation = () => {
    addReconciliation({
      accountId: reconAccountId,
      statementDate: reconStatementDate,
      statementEndingBalanceCents: statementEndingCents,
      clearedDebitsCents: clearedCents > 0 ? clearedCents : 0,
      clearedCreditsCents: clearedCents < 0 ? Math.abs(clearedCents) : 0,
      differenceCents: reconDifferenceCents,
      status: reconDifferenceCents === 0 ? 'Balanced' : 'In Progress',
      reconciledBy: activeCompany.email
    });
    showToast(`Reconciliation for ${reconAccount?.name || 'Bank'} saved!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="company-settings-dialog"
        className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{activeCompany.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-mono">
                  {activeCompany.currency} ({activeCompany.currencySymbol})
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Next-Gen Multi-Company Enterprise Configuration & Controls
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {toastMessage && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500 text-white text-xs font-medium animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Subnav & Right Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Subnav */}
          <div className="w-60 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto shrink-0 hidden sm:block">
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Company & Controls
              </div>
              <button
                onClick={() => setActiveSection('account-settings')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'account-settings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <span>Account and settings</span>
              </button>

              <button
                onClick={() => setActiveSection('manage-users')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'manage-users' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="flex-1">Manage users</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                  {companyUsers.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSection('switch-company')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'switch-company' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Shuffle className="w-4 h-4 shrink-0 text-blue-600" />
                <span className="flex-1">Switch company</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-mono">
                  {companies.length}
                </span>
              </button>

              <div className="pt-3 px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Accounting Tools
              </div>

              <button
                onClick={() => setActiveSection('reconcile')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'reconcile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0" />
                <span>Reconcile</span>
              </button>

              <button
                onClick={() => setActiveSection('budgeting')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'budgeting' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <PieChart className="w-4 h-4 shrink-0" />
                <span>Budgeting</span>
              </button>

              <button
                onClick={() => setActiveSection('reclassify-transactions')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'reclassify-transactions' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Reclassify transactions</span>
              </button>

              <button
                onClick={() => setActiveSection('export-data')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'export-data' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Export data</span>
              </button>

              <button
                onClick={() => setActiveSection('import-data')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'import-data' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <UploadCloud className="w-4 h-4 shrink-0" />
                <span>Import data</span>
              </button>

              <div className="pt-3 px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Lists & Defaults
              </div>

              <button
                onClick={() => setActiveSection('products-services')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'products-services' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Tag className="w-4 h-4 shrink-0" />
                <span>Products and services</span>
              </button>

              <button
                onClick={() => setActiveSection('recurring-transactions')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'recurring-transactions' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Recurring transactions</span>
              </button>

              <button
                onClick={() => setActiveSection('subscriptions-billing')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                  activeSection === 'subscriptions-billing' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Subscriptions and billing</span>
              </button>
            </div>
          </div>

          {/* Right Main Content Panel */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
            
            {/* SECTION 1: ACCOUNT AND SETTINGS */}
            {activeSection === 'account-settings' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Account and settings</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage company identity, contact addresses, financial year rules, and closing book locks.
                  </p>
                </div>

                {/* Internal Subtabs */}
                <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('company')}
                    className={`pb-3 cursor-pointer transition-colors relative ${
                      settingsTab === 'company' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('advanced')}
                    className={`pb-3 cursor-pointer transition-colors relative ${
                      settingsTab === 'advanced' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Advanced (Accounting Rules)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('sales')}
                    className={`pb-3 cursor-pointer transition-colors relative ${
                      settingsTab === 'sales' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sales & Invoicing
                  </button>
                </div>

                {/* SUBTAB: COMPANY */}
                {settingsTab === 'company' && (
                  <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>Company Name & Legal Registration</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Company Name *</label>
                          <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="e.g. Finex Global Technologies"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Legal Name</label>
                          <input
                            type="text"
                            value={legalName}
                            onChange={(e) => setLegalName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="e.g. Finex Global Technologies Inc."
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Employer ID No. (EIN / Tax ID)</label>
                          <input
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="e.g. 12-3456789"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Industry Classification</label>
                          <input
                            type="text"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="e.g. Technology & Cloud Solutions"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span>Corporate Contact Info</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Company Email</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="corporate@company.com"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Company Phone</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="+1 (800) 555-0199"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Website</label>
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="https://company.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Info */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span>Company Address</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                          <input
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="100 Enterprise Way, Suite 400"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="San Francisco"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">State / Province</label>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="CA"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">ZIP / Postal Code</label>
                          <input
                            type="text"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="94105"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Country</label>
                          <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="United States"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        Save Company Changes
                      </button>
                    </div>
                  </form>
                )}

                {/* SUBTAB: ADVANCED (ACCOUNTING RULES & CLOSING BOOKS) */}
                {settingsTab === 'advanced' && (
                  <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                    {/* Accounting Rules */}
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Scale className="w-4 h-4 text-blue-600" />
                        <span>Accounting Standards & Financial Year</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">First Month of Financial Year</label>
                          <select
                            value={fiscalYearMonth}
                            onChange={(e) => setFiscalYearMonth(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                          >
                            {MONTH_NAMES.map((m, idx) => (
                              <option key={m} value={idx + 1}>{m}</option>
                            ))}
                          </select>
                          <p className="text-[11px] text-slate-500 mt-1">Determines annual P&L and Balance Sheet reporting cycles.</p>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">First Month of Tax Year</label>
                          <select
                            value={taxYearMonth}
                            onChange={(e) => setTaxYearMonth(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                          >
                            {MONTH_NAMES.map((m, idx) => (
                              <option key={m} value={idx + 1}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Accounting Method</label>
                          <div className="flex items-center gap-6 mt-2">
                            <label className="flex items-center gap-2 font-medium cursor-pointer">
                              <input
                                type="radio"
                                name="accountingMethod"
                                value="Accrual"
                                checked={accountingMethod === 'Accrual'}
                                onChange={() => setAccountingMethod('Accrual')}
                                className="text-blue-600"
                              />
                              <span>Accrual (GAAP/IFRS Standard)</span>
                            </label>
                            <label className="flex items-center gap-2 font-medium cursor-pointer">
                              <input
                                type="radio"
                                name="accountingMethod"
                                value="Cash"
                                checked={accountingMethod === 'Cash'}
                                onChange={() => setAccountingMethod('Cash')}
                                className="text-blue-600"
                              />
                              <span>Cash Basis</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Operating Currency</label>
                          <select
                            value={currency}
                            onChange={(e) => {
                              const sel = CURRENCIES.find(c => c.code === e.target.value);
                              setCurrency(e.target.value);
                              if (sel) setCurrencySymbol(sel.symbol);
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                          >
                            {CURRENCIES.map(c => (
                              <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Close The Books */}
                    <div className="bg-amber-50/70 p-5 rounded-lg border border-amber-200 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-700" />
                            <span>Close the Books (Closing Date Lock)</span>
                          </h4>
                          <p className="text-xs text-amber-800 mt-1">
                            Prevent accidental changes to transactions dated on or before a closing date.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={closeBooks}
                            onChange={(e) => setCloseBooks(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                      </div>

                      {closeBooks && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-amber-200/60">
                          <div>
                            <label className="block font-bold text-amber-900 mb-1">Closing Date</label>
                            <input
                              type="date"
                              required={closeBooks}
                              value={closingDate}
                              onChange={(e) => setClosingDate(e.target.value)}
                              className="w-full bg-white border border-amber-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-600"
                            />
                            <p className="text-[11px] text-amber-700 mt-1">
                              Transactions on or before this date cannot be created or altered without the closing password.
                            </p>
                          </div>

                          <div>
                            <label className="block font-bold text-amber-900 mb-1">Closing Password (Optional)</label>
                            <input
                              type="password"
                              value={closingPassword}
                              onChange={(e) => setClosingPassword(e.target.value)}
                              className="w-full bg-white border border-amber-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-600"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        Save Accounting Rules
                      </button>
                    </div>
                  </form>
                )}

                {/* SUBTAB: SALES & INVOICING */}
                {settingsTab === 'sales' && (
                  <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Sales Form Defaults
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Preferred Invoice Payment Terms</label>
                          <select
                            value={defaultTerms}
                            onChange={(e) => setDefaultTerms(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                          >
                            <option value="Due on receipt">Due on receipt</option>
                            <option value="Net 15">Net 15 (15 Days)</option>
                            <option value="Net 30">Net 30 (30 Days)</option>
                            <option value="Net 60">Net 60 (60 Days)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Default Invoice Message to Customer</label>
                          <textarea
                            rows={3}
                            value={defaultSalesMessage}
                            onChange={(e) => setDefaultSalesMessage(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                            placeholder="Thank you for your business!"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        Save Sales Defaults
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* SECTION 2: MANAGE USERS */}
            {activeSection === 'manage-users' && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Manage Users</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Team members with access to <strong>{activeCompany.name}</strong>.
                    </p>
                  </div>
                </div>

                {/* Invite Form */}
                <form onSubmit={handleInviteUser} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    + Invite New Company User
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="User Full Name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        placeholder="corporate_email@company.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                      >
                        <option value="Admin">Admin (Full Control)</option>
                        <option value="Standard">Standard User</option>
                        <option value="Accountant">Company Accountant</option>
                        <option value="Read-only">Read-Only Viewer</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition-colors shrink-0 cursor-pointer"
                      >
                        Send Invite
                      </button>
                    </div>
                  </div>
                </form>

                {/* Users Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Email ID</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Joined Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {companyUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-900">{u.name}</td>
                          <td className="p-3 text-slate-600 font-mono">{u.email}</td>
                          <td className="p-3">
                            <select
                              value={u.role}
                              onChange={(e) => updateCompanyUserRole(u.id, e.target.value as UserRole)}
                              className="bg-transparent border border-slate-200 rounded px-2 py-1 text-slate-800 text-xs font-medium"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Standard">Standard</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Read-only">Read-only</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {u.joinedAt ? u.joinedAt.split('T')[0] : 'Today'}
                          </td>
                          <td className="p-3 text-right">
                            {companyUsers.length > 1 && (
                              <button
                                onClick={() => removeCompanyUser(u.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                                title="Revoke user access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 3: SWITCH COMPANY & MULTI-COMPANY MANAGER */}
            {activeSection === 'switch-company' && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Switch Company</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose which company ledger to access, or launch a new company with isolated accounting records.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreatingCompany(!isCreatingCompany)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingCompany ? 'Cancel' : '+ Add New Company'}</span>
                  </button>
                </div>

                {/* New Company Creation Wizard */}
                {isCreatingCompany && (
                  <form onSubmit={handleCreateNewCompany} className="bg-blue-50/60 p-5 rounded-lg border border-blue-200 space-y-4 animate-in fade-in">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Setup New Company Environment
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Company Display Name *</label>
                        <input
                          type="text"
                          required
                          value={newCompName}
                          onChange={(e) => setNewCompName(e.target.value)}
                          placeholder="e.g. Apex Global Logistics"
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Legal Registered Name</label>
                        <input
                          type="text"
                          value={newCompLegalName}
                          onChange={(e) => setNewCompLegalName(e.target.value)}
                          placeholder="e.g. Apex Global Logistics LLC"
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Industry</label>
                        <input
                          type="text"
                          value={newCompIndustry}
                          onChange={(e) => setNewCompIndustry(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Operating Currency</label>
                        <select
                          value={newCompCurrency}
                          onChange={(e) => setNewCompCurrency(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                        >
                          {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">First Month of Fiscal Year</label>
                        <select
                          value={newCompFiscalMonth}
                          onChange={(e) => setNewCompFiscalMonth(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                        >
                          {MONTH_NAMES.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Headquarters City & State</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={newCompCity}
                            onChange={(e) => setNewCompCity(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={newCompState}
                            onChange={(e) => setNewCompState(e.target.value)}
                            className="w-20 bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCompany(false)}
                        className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-all shadow-xs"
                      >
                        Provision & Open Company
                      </button>
                    </div>
                  </form>
                )}

                {/* List of Companies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companies.map((c) => {
                    const isCurrent = c.id === activeCompany.id;
                    return (
                      <div
                        key={c.id}
                        className={`p-5 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-blue-50/50 border-blue-400 shadow-sm ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-xs ${
                              isCurrent ? 'bg-blue-600' : 'bg-slate-700'
                            }`}>
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-semibold uppercase">
                                    Active
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-slate-500 font-sans">{c.industry || 'General Business'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Tax ID / EIN:</span>
                            <span className="font-mono text-slate-800">{c.taxId || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Currency:</span>
                            <span className="font-mono font-semibold text-slate-800">{c.currency} ({c.currencySymbol})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fiscal Year Start:</span>
                            <span className="text-slate-800">{MONTH_NAMES[c.fiscalYearStartMonth - 1]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accounting Method:</span>
                            <span className="text-slate-800">{c.accountingMethod}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          {isCurrent ? (
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Currently Open</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveCompanyId(c.id);
                                showToast(`Switched to "${c.name}"`);
                              }}
                              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Switch to this Company
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 4: RECONCILE TOOL */}
            {activeSection === 'reconcile' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Reconcile Bank & GL Accounts</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Compare bank statements against general ledger transactions to maintain 100% balance accuracy.
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account to Reconcile</label>
                    <select
                      value={reconAccountId}
                      onChange={(e) => setReconAccountId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-medium"
                    >
                      {accounts.filter(a => a.class === 'Asset').map(a => (
                        <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Statement Ending Date</label>
                    <input
                      type="date"
                      value={reconStatementDate}
                      onChange={(e) => setReconStatementDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Statement Ending Balance ({activeCompany.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={reconEndingBalance}
                      onChange={(e) => setReconEndingBalance(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Difference Summary Box */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-900 text-white text-xs">
                  <div>
                    <span className="text-slate-400">Statement Ending:</span>
                    <div className="text-base font-bold font-mono">
                      {activeCompany.currencySymbol}{(statementEndingCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Cleared Transactions:</span>
                    <div className="text-base font-bold font-mono text-blue-400">
                      {activeCompany.currencySymbol}{(clearedCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Difference:</span>
                    <div className={`text-base font-bold font-mono ${
                      reconDifferenceCents === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {activeCompany.currencySymbol}{(reconDifferenceCents / 100).toFixed(2)}
                      {reconDifferenceCents === 0 && ' (Balanced!)'}
                    </div>
                  </div>
                </div>

                {/* Transactions to check off */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 font-bold text-xs text-slate-700 flex justify-between items-center">
                    <span>Transactions in Ledger for Account {reconAccountId}</span>
                    <span className="text-slate-500 font-normal">Check off transactions that appear on statement</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {relevantEntries.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No transactions found for this account in the current company ledger.
                      </div>
                    ) : (
                      relevantEntries.map(entry => {
                        const line = entry.lines.find(l => l.accountId === reconAccountId);
                        if (!line) return null;
                        const isCleared = !!clearedEntryIds[entry.id];
                        return (
                          <div
                            key={entry.id}
                            onClick={() => setClearedEntryIds(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                            className={`flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                              isCleared ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isCleared}
                                onChange={() => {}}
                                className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-slate-900">{entry.reference}</span>
                                <span className="text-slate-500 ml-2 font-mono text-[11px]">{entry.date}</span>
                                <p className="text-slate-600 text-[11px]">{entry.description}</p>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-slate-900">
                              {line.debit > 0 ? (
                                <span className="text-emerald-700">+{activeCompany.currencySymbol}{(line.debit / 100).toFixed(2)}</span>
                              ) : (
                                <span className="text-slate-700">-{activeCompany.currencySymbol}{(line.credit / 100).toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleFinishReconciliation}
                    className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Finish Reconciliation & Save
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 5: BUDGETING TOOL */}
            {activeSection === 'budgeting' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Annual & Monthly Budgeting</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Set financial targets for revenue, COGS, and operating expenses for {activeCompany.name}.
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GL Account</label>
                    <select
                      value={selectedBudgetAccount}
                      onChange={(e) => setSelectedBudgetAccount(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-medium"
                    >
                      {accounts.filter(a => a.class === 'Revenue' || a.class === 'Expense').map(a => (
                        <option key={a.id} value={a.id}>{a.id} - {a.name} ({a.class})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Fiscal Year</label>
                    <select
                      value={budgetFiscalYear}
                      onChange={(e) => setBudgetFiscalYear(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-medium"
                    >
                      {[2024, 2025, 2026, 2027].map(yr => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Monthly Budget Allocation ({activeCompany.currencySymbol})</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={monthlyBudgetInput}
                        onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                      <button
                        onClick={() => {
                          const mCents = Math.round(parseFloat(monthlyBudgetInput || '0') * 100);
                          const months = Array(12).fill(mCents);
                          saveBudget({
                            fiscalYear: budgetFiscalYear,
                            accountId: selectedBudgetAccount,
                            monthlyBudgetCents: months,
                            totalBudgetCents: mCents * 12
                          });
                          showToast(`Budget for account ${selectedBudgetAccount} saved!`);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Budget vs Actual Display */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-100 font-bold text-xs text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>Saved Budgets for FY {budgetFiscalYear}</span>
                    <span>Total Annual Target</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {budgets.filter(b => b.fiscalYear === budgetFiscalYear).length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        No budget records created for FY {budgetFiscalYear}. Use the form above to add targets.
                      </div>
                    ) : (
                      budgets.filter(b => b.fiscalYear === budgetFiscalYear).map(b => {
                        const acct = accounts.find(a => a.id === b.accountId);
                        return (
                          <div key={b.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                            <div>
                              <span className="font-bold text-slate-900">{b.accountId} - {acct?.name || 'Account'}</span>
                              <span className="text-slate-500 text-[11px] ml-2">({acct?.class})</span>
                            </div>
                            <div className="font-mono font-bold text-blue-700">
                              {activeCompany.currencySymbol}{(b.totalBudgetCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} / yr
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: EXPORT DATA */}
            {activeSection === 'export-data' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Export Company Data</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Download complete general ledgers, trial balances, and journals for <strong>{activeCompany.name}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">General Ledger (CSV)</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Export all journal entries, line items, and account debits/credits in spreadsheet-ready CSV format.
                      </p>
                    </div>
                    <button
                      onClick={() => handleExportData('csv')}
                      className="mt-4 w-full py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CSV Ledger</span>
                    </button>
                  </div>

                  <div className="p-5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Complete Enterprise Backup (JSON)</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Full machine-readable backup containing company profile, Chart of Accounts, journal vouchers, and audit trails.
                      </p>
                    </div>
                    <button
                      onClick={() => handleExportData('json')}
                      className="mt-4 w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JSON Archive</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: PRODUCTS & SERVICES */}
            {activeSection === 'products-services' && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Products and Services</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Catalog of items sold or purchased for {activeCompany.name}.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Item Name</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Income Account</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                          <td className="p-3 font-mono text-slate-600">{p.sku}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px]">{p.type}</span></td>
                          <td className="p-3 font-mono font-bold">{activeCompany.currencySymbol}{(p.priceCents / 100).toFixed(2)}</td>
                          <td className="p-3 font-mono text-slate-600">{p.incomeAccountId}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 8: RECURRING TRANSACTIONS */}
            {activeSection === 'recurring-transactions' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Recurring Transactions</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Automated journal vouchers and recurring customer invoices.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Template Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Frequency</th>
                        <th className="p-3">Next Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recurringTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{t.templateName}</td>
                          <td className="p-3">{t.type}</td>
                          <td className="p-3">{t.frequency}</td>
                          <td className="p-3 font-mono">{t.nextDate}</td>
                          <td className="p-3 font-mono font-bold">{activeCompany.currencySymbol}{(t.amountCents / 100).toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              t.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => toggleRecurringTransaction(t.id)}
                              className="px-2 py-1 text-[11px] rounded border border-slate-300 hover:bg-slate-100 font-medium cursor-pointer"
                            >
                              {t.status === 'Active' ? 'Pause' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION 9: RECLASSIFY TRANSACTIONS */}
            {activeSection === 'reclassify-transactions' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Reclassify Transactions</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Accountant tool: Batch reassign GL accounts across existing journal lines in {activeCompany.name}.
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transfer From Account</label>
                    <select
                      value={reclassifyFromAccount}
                      onChange={(e) => setReclassifyFromAccount(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reclassify To Target Account</label>
                    <select
                      value={reclassifyToAccount}
                      onChange={(e) => setReclassifyToAccount(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.id} - {a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      showToast(`Reclassified matching lines from account ${reclassifyFromAccount} to ${reclassifyToAccount}.`);
                    }}
                    className="px-6 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Execute Batch Reclassification
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 10: SUBSCRIPTIONS & BILLING & WHAT'S NEW */}
            {(activeSection === 'subscriptions-billing' || activeSection === 'whats-new' || activeSection === 'payroll-settings' || activeSection === 'additional-info') && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {activeSection === 'subscriptions-billing' ? 'Subscriptions & Billing' :
                     activeSection === 'whats-new' ? "What's New in FinexERP" :
                     activeSection === 'payroll-settings' ? 'Payroll Configuration' : 'Company Additional Info'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Multi-Company Tier: Enterprise Unlimited Multi-Entity License
                  </p>
                </div>

                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 space-y-4 text-xs text-slate-700">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div>
                      <span className="text-base font-bold text-slate-900">FinexERP Multi-Company Suite</span>
                      <p className="text-slate-500">Includes complete QBO-style Mega Menu, GAAP closing rules, and bank reconciliations.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[11px]">
                      Active Enterprise License
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Active Companies</span>
                      <span className="text-base font-bold font-mono text-slate-900">{companies.length} of Unlimited</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Company Seats</span>
                      <span className="text-base font-bold font-mono text-slate-900">{companyUsers.length} Users</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Accounting Standard</span>
                      <span className="text-base font-bold text-slate-900">{activeCompany.accountingMethod}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Books Status</span>
                      <span className={`text-base font-bold ${activeCompany.closeBooks ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {activeCompany.closeBooks ? 'Closed / Locked' : 'Open'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
