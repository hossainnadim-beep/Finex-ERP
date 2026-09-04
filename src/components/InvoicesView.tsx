/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Account, JournalEntry, JournalLine, IssuedInvoice } from '../types';
import { useAuth } from '../AuthContext';
import { useCompany } from '../CompanyContext';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Calculator, 
  FileCheck, 
  Building, 
  Calendar, 
  Coins,
  History,
  TrendingUp,
  Percent,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface InvoicesViewProps {
  accounts: Account[];
  onPostSuccess: (entry: JournalEntry) => void;
  currentUserEmail: string;
  onCreateAccount: (newAccount: Account) => Promise<boolean>;
}

interface InvoiceLineItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  rate: number; // Dollars
}

const STANDARD_PRODUCTS = [
  { id: 'prod-consulting', name: 'Corporate Financial Consulting', description: 'Enterprise ERP implementation guidance, custom reporting advisory, and configuration service.', rate: 150 },
  { id: 'prod-audit', name: 'SOX Compliance Audit Preparation', description: 'Comprehensive audit readiness analysis and controls mapping verification.', rate: 2500 },
  { id: 'prod-support', name: 'Ongoing Controller Advisory Support', description: 'Active ledger monitoring, bookkeeping assurance, and monthly closing assessment.', rate: 850 },
  { id: 'prod-integration', name: 'ERP Custom Database Connection', description: 'Technical API integrations, secure webhook delivery, and sandbox seeding services.', rate: 180 },
  { id: 'prod-custom', name: 'Custom Product / Service', description: '', rate: 0 }
];

export default function InvoicesView({ accounts, onPostSuccess, currentUserEmail, onCreateAccount }: InvoicesViewProps) {
  const { supabase, session } = useAuth();
  const { activeCompany, isPeriodClosed, verifyClosingPassword } = useCompany();
  
  // Tab within invoices: 'create' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');
  
  // Invoice Header Inputs
  const [customerName, setCustomerName] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Default due date: 30 days from today
  const getThirtyDaysFromToday = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };
  const [dueDate, setDueDate] = useState<string>(getThirtyDaysFromToday());
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [taxRateInput, setTaxRateInput] = useState<string>('8.25');

  // Invoice Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: 'item-1',
      productId: 'prod-consulting',
      description: 'Enterprise ERP implementation guidance, custom reporting advisory, and configuration service.',
      quantity: 10,
      rate: 150
    }
  ]);

  // History of Invoices issued in space
  const [invoiceHistory, setInvoiceHistory] = useState<IssuedInvoice[]>([]);
  
  // Status & notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState<boolean>(false);

  // Initialize and load saved invoices upon session change or company change
  useEffect(() => {
    try {
      const userId = session?.user?.id || 'guest';
      const companyKey = activeCompany?.id 
        ? `finex_company_${activeCompany.id}_invoices` 
        : `conexerp_saved_invoices_${userId}`;
      const saved = localStorage.getItem(companyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setInvoiceHistory(parsed);
        } else {
          setInvoiceHistory([]);
        }
      } else {
        setInvoiceHistory([]);
      }
    } catch (e) {
      console.error('Error reading invoice history state:', e);
      setInvoiceHistory([]);
    }
    
    // Auto generate next sequence Invoice Number
    const nextSeq = `INV-${Date.now().toString().slice(-4)}`;
    setInvoiceNumber(nextSeq);
  }, [session, activeCompany?.id]);

  // Pre-requisite accounts auto setup
  useEffect(() => {
    const ensureRequiredAccounts = async () => {
      // 1200 (Accounts Receivable), 4000 (Sales Revenue), 2200 (Sales Tax Payable)
      const reqs = [
        { id: '1200', name: 'Accounts Receivable', class: 'Asset' as const, normalBalance: 'Debit' as const, description: 'Billed client receivables and company invoices outstanding.' },
        { id: '4000', name: 'Sales Revenue', class: 'Revenue' as const, normalBalance: 'Credit' as const, description: 'Operational revenue earned from customer invoices.' },
        { id: '2200', name: 'Sales Tax Payable', class: 'Liability' as const, normalBalance: 'Credit' as const, description: 'Sales taxes collected and owed to taxing authorities.' }
      ];

      for (const req of reqs) {
        const match = accounts.find(a => a.id === req.id);
        if (!match || (req.id === '1200' && match.name !== 'Accounts Receivable')) {
          console.log(`Auto-creating required accounts for invoicing: ${req.id} - ${req.name}`);
          try {
            await onCreateAccount(req);
          } catch (e) {
            console.error(`Failed to seed invoice account ${req.id}:`, e);
          }
        }
      }
    };

    if (accounts && accounts.length > 0) {
      ensureRequiredAccounts();
    }
  }, [accounts, onCreateAccount]);

  // Calculation helpers
  const getSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  };

  const getTaxRate = () => {
    const rate = parseFloat(taxRateInput);
    return isNaN(rate) || rate < 0 ? 0 : rate;
  };

  const getTaxAmount = () => {
    return getSubtotal() * (getTaxRate() / 100);
  };

  const getGrandTotal = () => {
    return getSubtotal() + getTaxAmount();
  };

  // Handling Product selection overrides description and default rate
  const handleProductChange = (index: number, productId: string) => {
    const match = STANDARD_PRODUCTS.find(p => p.id === productId);
    if (!match) return;

    setLineItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId,
        description: match.description,
        rate: match.rate
      };
      return copy;
    });
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: 'prod-custom',
        description: '',
        quantity: 1,
        rate: 0
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      setErrorMsg('Invoice must contain at least one line item.');
      return;
    }
    setLineItems(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  // Handle Invoice Issuance & Balanced Journal Entry Posting
  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg('Invoice reference number is required.');
      return;
    }
    if (lineItems.length === 0) {
      setErrorMsg('Please add at least one product/service line item.');
      return;
    }

    // Verify product entries are valid
    for (const item of lineItems) {
      if (item.quantity <= 0) {
        setErrorMsg('Quantity must be greater than zero for all lines.');
        return;
      }
      if (item.rate < 0) {
        setErrorMsg('Rate cannot be negative.');
        return;
      }
      if (!item.description.trim()) {
        setErrorMsg('Please provide a description for all line items.');
        return;
      }
    }

    // GAAP Accounting Control: Check if invoice date is in a closed period
    if (activeCompany && isPeriodClosed(invoiceDate)) {
      if (activeCompany.closingPassword) {
        const pwd = window.prompt(
          `ACCOUNTING CONTROL:\nThe books for ${activeCompany.name} are closed through ${activeCompany.closingDate}.\n\nEnter supervisory closing password to issue an invoice with posting date ${invoiceDate}:`
        );
        if (!pwd || !verifyClosingPassword(pwd)) {
          setErrorMsg(`Invoice creation blocked: Date (${invoiceDate}) falls within a closed financial period (locked through ${activeCompany.closingDate}). Authorized password required.`);
          return;
        }
      } else {
        const proceed = window.confirm(
          `Notice: Invoice posting date (${invoiceDate}) falls within a closed financial period (locked through ${activeCompany.closingDate}). Do you wish to continue?`
        );
        if (!proceed) {
          setErrorMsg('Invoice issuance cancelled: Period is closed.');
          return;
        }
      }
    }

    setIsIssuing(true);

    try {
      const subtotalCents = Math.round(getSubtotal() * 100);
      const taxRateValue = getTaxRate();
      const taxAmountCents = Math.round(getTaxAmount() * 100);
      const grandTotalCents = subtotalCents + taxAmountCents;

      if (grandTotalCents <= 0) {
        setErrorMsg('Total invoice amount must be greater than $0.00.');
        setIsIssuing(false);
        return;
      }

      // 1. Construct Journal lines
      // DEBIT AR (1200) for Grand Total (subtotal + tax)
      // CREDIT Revenue (4000) for Subtotal
      // CREDIT Tax Payable (2200) for Tax Amount
      
      const journalLines: JournalLine[] = [];
      const nowMs = Date.now();

      // Accounts Receivable debit line
      journalLines.push({
        id: `inv-debit-${nowMs}-1`,
        accountId: '1200',
        debit: grandTotalCents,
        credit: 0
      });

      // Sales Revenue credit line
      journalLines.push({
        id: `inv-credit-${nowMs}-2`,
        accountId: '4000',
        debit: 0,
        credit: subtotalCents
      });

      // Sales Tax credit line (if tax is greater than 0)
      if (taxAmountCents > 0) {
        journalLines.push({
          id: `inv-credit-${nowMs}-3`,
          accountId: '2200',
          debit: 0,
          credit: taxAmountCents
        });
      }

      let generatedJournalEntryId = `JE-${Date.now().toString().slice(-4)}`;

      // 2. Post to Supabase if connected
      if (session?.mode === 'supabase' && supabase) {
        try {
          const p_lines = journalLines.map(line => {
            const matchedAcct = accounts.find(a => a.id === line.accountId);
            return {
              account_id: matchedAcct?.dbId || matchedAcct?.id || line.accountId,
              debit_amount: line.debit,
              credit_amount: line.credit
            };
          });

          console.log('Issuing Invoice via Supabase Balanced Entry:', {
            p_date: invoiceDate,
            p_reference_number: invoiceNumber.toUpperCase(),
            p_description: `Invoice ${invoiceNumber.toUpperCase()} issued to ${customerName}`,
            p_lines
          });

          const { data, error } = await supabase.rpc('create_balanced_journal_entry', {
            p_date: invoiceDate,
            p_reference_number: invoiceNumber.toUpperCase(),
            p_description: `Invoice ${invoiceNumber.toUpperCase()} issued to ${customerName}`,
            p_lines
          });

          if (error) {
            console.error('Supabase Invoice Posting via RPC Failed:', error);
            setErrorMsg(`Database RPC Posting failed: ${error.message}. Saved state is retained locally.`);
            setIsIssuing(false);
            return;
          }

          if (data && typeof data === 'string') {
            generatedJournalEntryId = data;
          }
        } catch (dbErr: any) {
          console.error('Database connection crash inside InvoicesView:', dbErr);
          setErrorMsg(`Database connection lost: ${dbErr.message || 'Saving offline fallback.'}`);
          setIsIssuing(false);
          return;
        }
      }

      // 3. Complete posting context inside parent application state
      const journalEntryPayload: JournalEntry = {
        id: generatedJournalEntryId,
        date: invoiceDate,
        reference: invoiceNumber.toUpperCase(),
        description: `Invoice ${invoiceNumber.toUpperCase()} issued to ${customerName}`,
        lines: journalLines,
        isReversed: false,
        reversedEntryId: null,
        reversingForId: null,
        createdAt: new Date().toISOString(),
        createdBy: currentUserEmail || 'client-billing@finexerp.io',
        companyId: activeCompany?.id
      };

      // Execute Parent Posting Callback (propagates updates automatically)
      await onPostSuccess(journalEntryPayload);

      // 4. Save Invoice record to localized history list
      const newInvoice: IssuedInvoice = {
        id: `invoice-${nowMs}`,
        invoiceNumber: invoiceNumber.toUpperCase(),
        customerName: customerName.trim(),
        invoiceDate,
        dueDate,
        subtotal: getSubtotal(),
        taxRate: taxRateValue,
        taxAmount: getTaxAmount(),
        grandTotal: getGrandTotal(),
        journalEntryId: generatedJournalEntryId,
        lines: [...lineItems],
        companyId: activeCompany?.id
      };

      const updatedHistory = [newInvoice, ...invoiceHistory];
      setInvoiceHistory(updatedHistory);
      const userId = session?.user?.id || 'guest';
      const companyKey = activeCompany?.id 
        ? `finex_company_${activeCompany.id}_invoices` 
        : `conexerp_saved_invoices_${userId}`;
      localStorage.setItem(companyKey, JSON.stringify(updatedHistory));

      // 5. Reset inputs cleanly & issue feedback
      setSuccessMsg(`Invoice ${invoiceNumber.toUpperCase()} issued successfully! Journal entry ${generatedJournalEntryId} posted behind the scenes.`);
      setCustomerName('');
      setLineItems([
        {
          id: 'item-1',
          productId: 'prod-consulting',
          description: 'Enterprise ERP implementation guidance, custom reporting advisory, and configuration service.',
          quantity: 10,
          rate: 150
        }
      ]);
      setTaxRateInput('8.25');
      // Create new sequencial invoice number
      setInvoiceNumber(`INV-${Date.now().toString().slice(-4)}`);

    } catch (err: any) {
      console.error('Global issue invoicing error:', err);
      setErrorMsg(`Failed to issue invoice: ${err.message || 'Unknown state error.'}`);
    } finally {
      setIsIssuing(false);
    }
  };

  const formatCurrencyValue = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 font-sans flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Corporate Invoicing Center
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-sans">
            Issue client invoices and automatically sync balanced journal entries across ledger registries
          </p>
        </div>

        {/* View Switches */}
        <div className="flex bg-zinc-900/60 p-0.5 rounded border border-zinc-800 self-start sm:self-center font-mono">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeSubTab === 'create'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus className="h-3 w-3" />
            New Invoice
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="h-3 w-3" />
            Invoices History ({invoiceHistory.length})
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-start gap-3 p-4 bg-emerald-950/30 border border-emerald-500/20 rounded text-emerald-400 text-xs animate-fade-in font-sans">
          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success Confirmed</p>
            <p className="mt-0.5 opacity-90">{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 bg-rose-950/30 border border-rose-500/20 rounded text-rose-450 text-xs animate-fade-in font-sans">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Invoicing Error</p>
            <p className="mt-0.5 opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* SUBTAB: CREATE INVOICE */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleIssueInvoice} className="bg-[#121214] border border-zinc-800 rounded p-6 shadow-sm space-y-6">
          
          {/* Form Top Headers Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-zinc-850">
            
            {/* Customer */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block font-mono">
                Bill To Customer
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation Ltd"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-blue-500 pl-9 font-sans"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isIssuing}
                />
              </div>
            </div>

            {/* Invoice Ref # */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block font-mono">
                Invoice ID
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-650 font-mono text-blue-400 font-semibold focus:outline-none focus:border-blue-500 pl-9"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isIssuing}
                />
              </div>
            </div>

            {/* Invoicing Dates Column */}
            <div className="grid grid-cols-2 gap-2 md:col-span-1">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block font-mono">
                  Invoice Date
                </label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 font-mono"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isIssuing}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block font-mono">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 font-mono"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isIssuing}
                />
              </div>
            </div>

          </div>

          {/* Line Items Dynamic Desk Table */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-350 font-mono flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-blue-500/80" />
              Invoice Products & Services Lines
            </h3>

            <div className="overflow-x-auto border border-zinc-800/85 rounded bg-zinc-900/20">
              <table className="w-full text-left border-collapse table-auto min-w-[750px]">
                <thead>
                  <tr className="bg-zinc-900/60 text-zinc-450 text-[10px] uppercase tracking-wider font-mono border-b border-zinc-800 select-none">
                    <th className="py-2.5 px-4 font-bold max-w-[200px]">Product / Service</th>
                    <th className="py-2.5 px-4 font-bold">Line Details Description</th>
                    <th className="py-2.5 px-4 font-bold w-20 text-center">Qty</th>
                    <th className="py-2.5 px-4 font-bold w-32">Unit Rate ($)</th>
                    <th className="py-2.5 px-4 font-bold w-32 text-right">Line Total</th>
                    <th className="py-2.5 px-4 font-bold w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-zinc-900/10 transition-colors">
                      
                      {/* Product Selector */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <select
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-250 focus:outline-none focus:border-blue-500 font-sans cursor-pointer truncate"
                          value={item.productId}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          disabled={isIssuing}
                        >
                          {STANDARD_PRODUCTS.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Description Input */}
                      <td className="py-3 px-3">
                        <textarea
                          placeholder="Line description details..."
                          rows={1}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-500 font-sans resize-y"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          disabled={isIssuing}
                        />
                      </td>

                      {/* Quantity Input */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="1"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-center text-zinc-100 focus:outline-none focus:border-blue-500 font-mono font-semibold"
                          value={item.quantity || ''}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          disabled={isIssuing}
                        />
                      </td>

                      {/* Rate Input */}
                      <td className="py-3 px-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-[10px] text-zinc-550 font-bold font-mono">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-6 pr-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-blue-500 font-mono font-semibold"
                            value={item.rate || ''}
                            onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            disabled={isIssuing}
                          />
                        </div>
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-right text-xs font-mono font-semibold text-zinc-200 uppercase select-none">
                        {formatCurrencyValue(item.quantity * item.rate)}
                      </td>

                      {/* Delete Action button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-zinc-550 hover:text-red-400 p-1 rounded hover:bg-zinc-900 transition-all cursor-pointer"
                          title="Remove item"
                          disabled={isIssuing}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Line Action */}
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-blue-400 rounded transition-all cursor-pointer font-mono shadow-sm"
              disabled={isIssuing}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product Line Item
            </button>
          </div>

          {/* Form Bottom Row with Totals and Pay Calculation Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-850">
            
            {/* Left Context: Explanation detailing auto journal posting mechanics */}
            <div className="h-fit bg-[#0f0f11]/60 border border-zinc-850 rounded p-4 space-y-2.5 text-zinc-400 text-xs font-sans">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 block font-mono flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Dual-Posting Ledger Automation
              </span>
              <p className="leading-relaxed opacity-95">
                Posting this invoice executes cryptographic ERP balance rules. Behind the scenes, FinexERP creates and saves a perfectly balanced double-entry General Ledger voucher:
              </p>
              <div className="space-y-1 font-mono text-[10px] bg-zinc-950/40 p-2.5 rounded border border-zinc-800/80">
                <p className="text-emerald-450 font-semibold">
                  DEBIT &nbsp; '1200 - Accounts Receivable' &rarr; {formatCurrencyValue(getGrandTotal())}
                </p>
                <p className="text-blue-400">
                  CREDIT '4000 - Sales Revenue' &rarr; {formatCurrencyValue(getSubtotal())}
                </p>
                {getTaxAmount() > 0 && (
                  <p className="text-amber-400">
                    CREDIT '2200 - Sales Tax Payable' &rarr; {formatCurrencyValue(getTaxAmount())}
                  </p>
                )}
              </div>
            </div>

            {/* Right Context: Tax input, Subtotal, Grand Total Calculation Panel */}
            <div className="bg-zinc-950/40 border border-zinc-850/80 rounded p-5 space-y-3.5">
              
              {/* Subtotal Selection Row */}
              <div className="flex items-center justify-between text-xs text-zinc-400 font-sans border-b border-zinc-900 pb-2">
                <span>Subtotal Sum</span>
                <span className="font-mono font-semibold text-zinc-200">
                  {formatCurrencyValue(getSubtotal())}
                </span>
              </div>

              {/* Tax Percentage Modification */}
              <div className="flex items-center justify-between text-xs text-zinc-400 font-sans">
                <div className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span>Sales Tax Rate Percentage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-16 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-center font-mono font-semibold text-zinc-200 text-xs focus:outline-none focus:border-blue-500"
                    value={taxRateInput}
                    onChange={(e) => setTaxRateInput(e.target.value)}
                    disabled={isIssuing}
                  />
                  <span>%</span>
                </div>
              </div>

              {/* Calculated Tax Dollar Amount Row */}
              <div className="flex items-center justify-between text-xs text-zinc-450 font-sans pt-1">
                <span>Calculated Sales Tax Collected</span>
                <span className="font-mono font-semibold text-zinc-350">
                  {formatCurrencyValue(getTaxAmount())}
                </span>
              </div>

              {/* Grand Total display (High contrast) */}
              <div className="flex items-center justify-between text-sm font-sans pt-3 border-t border-zinc-800">
                <span className="font-bold text-zinc-100 uppercase tracking-widest text-xs font-mono">Invoice Invoice Grand Total</span>
                <span className="text-base font-mono font-extrabold text-blue-400">
                  {formatCurrencyValue(getGrandTotal())}
                </span>
              </div>

              {/* Actions submit button */}
              <div className="pt-2 select-none">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-md shadow-blue-900/10 disabled:opacity-50"
                  disabled={isIssuing}
                >
                  <FileCheck className="h-4 w-4 shrink-0" />
                  {isIssuing ? 'Transmitting Invoicing Rules...' : 'Issue Balanced Invoice'}
                </button>
              </div>

            </div>

          </div>

        </form>
      )}

      {/* SUBTAB: INVOICE LOG HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          
          {invoiceHistory.length === 0 ? (
            <div className="bg-[#121214] border border-zinc-800 rounded p-12 text-center text-zinc-500 font-sans space-y-3 shadow-inner selection:bg-none">
              <FileText className="h-10 w-10 text-zinc-750 mx-auto" strokeWidth={1.5} />
              <p className="text-sm font-semibold uppercase text-zinc-400 tracking-wider">No Invoices Issued Yet</p>
              <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                No outbound invoice vouchers have been issued in this active session environment. Connect back to the invoice generation pane to draft your first invoice ledger record.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('create')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all rounded shadow font-sans mt-2"
              >
                Create First Invoice
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Table version for Invoice Logs */}
              <div className="bg-[#121214] border border-zinc-800 rounded shadow-sm overflow-hidden">
                <div className="bg-zinc-900/60 p-4 border-b border-zinc-850 select-none">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300 font-mono flex items-center gap-2">
                    <History className="h-4 w-4 text-zinc-450" />
                    Historic Invoice Ledger Journals ({invoiceHistory.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-auto min-w-[750px]">
                    <thead>
                      <tr className="bg-zinc-950/20 text-zinc-500 text-[10px] uppercase tracking-wider font-mono border-b border-zinc-800 select-none">
                        <th className="py-2.5 px-4 font-bold">Invoice Ref</th>
                        <th className="py-2.5 px-4 font-bold">Customer Name</th>
                        <th className="py-2.5 px-4 font-bold">Billing Date</th>
                        <th className="py-2.5 px-4 font-bold">Due Date</th>
                        <th className="py-2.5 px-4 font-bold text-right">Subtotal</th>
                        <th className="py-2.5 px-4 font-bold text-center">Tax %</th>
                        <th className="py-2.5 px-4 font-bold text-right">Grand Total</th>
                        <th className="py-2.5 px-4 font-bold text-center">Journal Entry Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 font-sans text-xs">
                      {invoiceHistory.map(inv => (
                        <tr key={inv.id} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-zinc-200 font-semibold">
                            {inv.customerName}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 font-mono">
                            {inv.invoiceDate}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 font-mono">
                            {inv.dueDate}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-300">
                            {formatCurrencyValue(inv.subtotal)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-zinc-450">
                            {inv.taxRate.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-450 font-bold">
                            {formatCurrencyValue(inv.grandTotal)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono select-all">
                            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-400 font-bold tracking-wider hover:text-white transition-colors cursor-pointer" title="Double entry voucher reference index">
                              {inv.journalEntryId}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Detailed view display cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoiceHistory.slice(0, 4).map(inv => (
                  <div key={`card-${inv.id}`} className="bg-[#121214] border border-zinc-800 rounded p-4 font-sans space-y-3.5 relative overflow-hidden shadow">
                    
                    {/* Header line */}
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5 select-none">
                      <div>
                        <span className="text-[10px] bg-blue-950/40 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">
                          {inv.invoiceNumber}
                        </span>
                        <h4 className="font-bold text-zinc-200 mt-1.5 truncate max-w-[200px]" title={inv.customerName}>
                          {inv.customerName}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 font-mono block">Grand Total</span>
                        <span className="font-mono text-sm font-extrabold text-emerald-450">
                          {formatCurrencyValue(inv.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Meta specifics */}
                    <div className="grid grid-cols-3 text-[10px] font-mono text-zinc-450 bg-zinc-950/20 p-2 rounded border border-zinc-850">
                      <div>
                        <span className="block text-zinc-550 uppercase">Issued</span>
                        <span className="text-zinc-300 font-semibold">{inv.invoiceDate}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-550 uppercase">Due Date</span>
                        <span className="text-zinc-300 font-semibold">{inv.dueDate}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-zinc-550 uppercase">Tax Amount</span>
                        <span className="text-zinc-300 font-semibold">{formatCurrencyValue(inv.taxAmount)}</span>
                      </div>
                    </div>

                    {/* Products summary list */}
                    <div className="space-y-1 bg-zinc-950/10 p-2 rounded max-h-24 overflow-y-auto">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-550 block font-mono">Invoice Lines Summary</span>
                      {inv.lines.map((ln, i) => (
                        <div key={ln.id} className="text-[10px] flex items-center justify-between font-mono text-zinc-350 opacity-90">
                          <span className="truncate max-w-[170px]">&bull; {ln.description}</span>
                          <span>{ln.quantity}x @ {formatCurrencyValue(ln.rate)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom compliance code line */}
                    <div className="pt-2 text-[9px] text-zinc-550 uppercase tracking-wider flex items-center justify-between border-t border-zinc-850/60 font-mono select-none">
                      <span>SECURED TRANSACT COMPLIANT</span>
                      <span>JE Core Index: <span className="text-blue-450 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">{inv.journalEntryId}</span></span>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
