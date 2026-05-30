/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Account, JournalEntry, JournalLine, mapDbAccount } from '../types';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Calculator, FileText, Bookmark, Calendar } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface JournalEntryFormProps {
  onPostSuccess: (entry: JournalEntry) => void;
  currentUserEmail: string;
  accounts: Account[];
}

interface FormRow {
  id: string;
  accountId: string;
  debitStr: string;  // We keep strings for flawless input typing
  creditStr: string; // We keep strings for flawless input typing
}

export default function JournalEntryForm({ onPostSuccess, currentUserEmail, accounts }: JournalEntryFormProps) {
  const { supabase, session } = useAuth();
  const [liveAccounts, setLiveAccounts] = useState<Account[]>(accounts || []);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [rows, setRows] = useState<FormRow[]>([]);
  const [totalDebitsCents, setTotalDebitsCents] = useState<number>(0);
  const [totalCreditsCents, setTotalCreditsCents] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [postedAlert, setPostedAlert] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState<boolean>(false);

  // Sync with props fallback
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setLiveAccounts(accounts);
    }
  }, [accounts]);

  // Initialize rows dynamically when live accounts are available or when cleared
  useEffect(() => {
    if (liveAccounts && liveAccounts.length >= 2 && rows.length === 0) {
      setRows([
        { id: 'row-1', accountId: liveAccounts[0].id, debitStr: '', creditStr: '' },
        { id: 'row-2', accountId: liveAccounts[Math.min(6, liveAccounts.length - 1)].id, debitStr: '', creditStr: '' },
      ]);
    }
  }, [liveAccounts]);

  // Recalculate totals in real time (converting input strings safely to integer cents)
  useEffect(() => {
    let debitsSum = 0;
    let creditsSum = 0;

    rows.forEach(row => {
      // Clean string input, support float parse then multiply to get absolute cents
      const debitVal = parseFloat(row.debitStr);
      const creditVal = parseFloat(row.creditStr);

      if (!isNaN(debitVal) && debitVal > 0) {
        debitsSum += Math.round(debitVal * 100);
      }
      if (!isNaN(creditVal) && creditVal > 0) {
        creditsSum += Math.round(creditVal * 100);
      }
    });

    setTotalDebitsCents(debitsSum);
    setTotalCreditsCents(creditsSum);
  }, [rows]);

  const addRow = () => {
    if (!liveAccounts || liveAccounts.length === 0) return;
    // Select a default accounts ID that isn't the first row to be helpful
    const nextAccount = liveAccounts[Math.min(rows.length, liveAccounts.length - 1)].id;
    setRows([
      ...rows,
      { id: `row-${Date.now()}-${Math.random()}`, accountId: nextAccount, debitStr: '', creditStr: '' }
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 2) {
      setErrorMsg('A double-entry transaction must contain at least two account lines.');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof FormRow, value: string) => {
    setErrorMsg(null);
    setRows(rows.map(row => {
      if (row.id !== id) return row;

      // Double-Entry validation detail: a line can have a Debit OR a Credit, NOT both!
      if (field === 'debitStr' && value !== '') {
        return { ...row, debitStr: value, creditStr: '' };
      }
      if (field === 'creditStr' && value !== '') {
        return { ...row, debitStr: '', creditStr: value };
      }

      return { ...row, [field]: value };
    }));
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Initial basic validation
    if (!reference.trim()) {
      setErrorMsg('Please specify a Reference/Document ID (e.g., JE-1004).');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please provide a business description of the transaction.');
      return;
    }

    // Build lists of real ledger lines
    const parsedLines: JournalLine[] = [];
    let hasLineError = false;

    for (const row of rows) {
      const dVal = parseFloat(row.debitStr);
      const cVal = parseFloat(row.creditStr);
      const dCents = !isNaN(dVal) && dVal > 0 ? Math.round(dVal * 100) : 0;
      const cCents = !isNaN(cVal) && cVal > 0 ? Math.round(cVal * 100) : 0;

      if (dCents === 0 && cCents === 0) {
        setErrorMsg('Each line must have a positive Debit or Credit value.');
        hasLineError = true;
        break;
      }

      parsedLines.push({
        id: `line-${Date.now()}-${Math.random()}`,
        accountId: row.accountId,
        debit: dCents,
        credit: cCents
      });
    }

    if (hasLineError) return;

    // RULE 1: Double-Entry principle validation
    const totalDebits = parsedLines.reduce((sum, current) => sum + current.debit, 0);
    const totalCredits = parsedLines.reduce((sum, current) => sum + current.credit, 0);

    if (totalDebits !== totalCredits) {
      const imbalance = Math.abs(totalDebits - totalCredits);
      setErrorMsg(
        `Double-Entry Violation: Total Debits must equal Total Credits. Current imbalance: ${formatCurrency(imbalance)}`
      );
      return;
    }

    if (totalDebits === 0) {
      setErrorMsg('Transaction must have a non-zero financial volume.');
      return;
    }

    setIsPosting(true);

    let postedEntryId = `JE-${Date.now().toString().slice(-4)}`;

    // If Supabase is active, execute the RPC function
    if (supabase) {
      try {
        const p_lines = parsedLines.map(line => {
          const matchedAcct = liveAccounts.find(a => a.id === line.accountId);
          return {
            account_id: matchedAcct?.dbId || matchedAcct?.id || line.accountId,
            debit_amount: line.debit,
            credit_amount: line.credit
          };
        });

        console.log('Executing Supabase RPC create_balanced_journal_entry:', {
          p_date: date,
          p_reference_number: reference.toUpperCase(),
          p_description: description.trim(),
          p_lines
        });

        const { data, error } = await supabase.rpc('create_balanced_journal_entry', {
          p_date: date,
          p_reference_number: reference.toUpperCase(),
          p_description: description.trim(),
          p_lines: p_lines
        });

        if (error) {
          console.error('Supabase journal entry RPC failed:', error);
          setErrorMsg(`Database error: ${error.message} (Code: ${error.code}). Check if table access write policies or Row-Level-Security (RLS) policies are active on journal tables.`);
          setIsPosting(false);
          return;
        }

        if (data && typeof data === 'string') {
          postedEntryId = data;
        }
      } catch (err: any) {
        console.error('Supabase exception posting journal entry:', err);
        setErrorMsg(`Network/Connection failed: ${err.message || 'Check connection settings.'}`);
        setIsPosting(false);
        return;
      }
    }

    // Save and transmit the valid immutable journal entry
    const newEntry: JournalEntry = {
      id: postedEntryId,
      date,
      reference: reference.toUpperCase(),
      description: description.trim(),
      lines: parsedLines,
      isReversed: false,
      reversedEntryId: null,
      reversingForId: null,
      createdAt: new Date().toISOString(),
      createdBy: currentUserEmail
    };

    onPostSuccess(newEntry);
    setPostedAlert(true);
    setIsPosting(false);
    
    // Clear inputs
    setReference('');
    setDescription('');
    if (liveAccounts && liveAccounts.length >= 2) {
      setRows([
        { id: 'row-1', accountId: liveAccounts[0].id, debitStr: '', creditStr: '' },
        { id: 'row-2', accountId: liveAccounts[Math.min(6, liveAccounts.length - 1)].id, debitStr: '', creditStr: '' },
      ]);
    }

    setTimeout(() => {
      setPostedAlert(false);
    }, 4500);
  };

  const differenceCents = Math.abs(totalDebitsCents - totalCreditsCents);
  const isBalanced = totalDebitsCents === totalCreditsCents && totalDebitsCents > 0;

  return (
    <div className="bg-[#121214] shadow-xl rounded border border-zinc-800 overflow-hidden" id="journal-entry-form">
      
      {/* Form Header */}
      <div className="bg-[#09090b] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
            <Calculator className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Post General Journal Entry</h3>
            <p className="text-xs text-zinc-500">Adheres strictly to double-entry ledger balance rules</p>
          </div>
        </div>
        <div className="text-[10px] text-zinc-650 font-mono tracking-widest font-bold">
          AUDIT VOUCHER GENERATOR
        </div>
      </div>

      <form onSubmit={handlePost} className="p-6 space-y-6">
        
        {/* Alerts Block */}
        {postedAlert && (
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-800 text-emerald-300 text-xs rounded flex items-center gap-2" id="post-success-alert">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Journal entry has been validated, audited, and permanently posted to the General Ledger.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/20 border border-rose-805 text-rose-300 text-xs rounded flex items-center gap-2" id="post-error-alert">
            <Trash2 className="h-4 w-4 text-rose-455 shrink-0" id="form-error-icon" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Transaction Meta Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-zinc-400" /> Posting Date
            </label>
            <input
              type="date"
              required
              disabled={isPosting}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors text-xs font-mono disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Bookmark className="h-3 w-3 text-zinc-400" /> Reference/Doc #
            </label>
            <input
              type="text"
              required
              disabled={isPosting}
              placeholder="e.g., JE-1004, CHK-951"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-blue-500 transition-colors text-xs font-mono uppercase disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-zinc-400" /> Memo Description
            </label>
            <input
              type="text"
              required
              disabled={isPosting}
              placeholder="Brief description of business purpose"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-xs font-sans disabled:opacity-50"
            />
          </div>
        </div>

        {/* Ledger Transaction Grid Table */}
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-850 font-sans">
            <thead className="bg-[#09090b]">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-550 w-1/2">
                  Account Select
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-550 w-1/5">
                  Debit ($)
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-550 w-1/5">
                  Credit ($)
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-550 w-12">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 bg-[#121214]">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-zinc-900/20 transition-all">
                  <td className="p-3">
                    <select
                      value={row.accountId}
                      disabled={isPosting}
                      onChange={(e) => updateRow(row.id, 'accountId', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded text-zinc-100 text-xs focus:outline-none focus:border-blue-500 py-1.5 px-2.5 font-sans disabled:opacity-50"
                    >
                      {liveAccounts.map(account => (
                        <option key={account.id} value={account.id} className="bg-[#121214] text-zinc-205">
                          {account.id} – {account.name} ({account.class})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Debit Input */}
                  <td className="p-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPosting}
                        placeholder="0.00"
                        value={row.debitStr}
                        onChange={(e) => updateRow(row.id, 'debitStr', e.target.value)}
                        className="w-full pl-6 pr-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 text-right font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                    </div>
                  </td>

                  {/* Credit Input */}
                  <td className="p-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-605 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPosting}
                        placeholder="0.00"
                        value={row.creditStr}
                        onChange={(e) => updateRow(row.id, 'creditStr', e.target.value)}
                        className="w-full pl-6 pr-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 text-right font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 2 || isPosting}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded border border-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dynamic add line capability */}
        <div className="flex justify-between items-center bg-[#09090b] p-3 rounded border border-zinc-800">
          <button
            type="button"
            onClick={addRow}
            disabled={isPosting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-805 text-blue-400 hover:text-blue-300 rounded border border-zinc-800 font-medium text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="h-3.5 w-3.5" /> Add Ledger Line
          </button>
          
          <div className="text-[10px] text-zinc-500 font-mono">
            MIN. 2 OPPOSING ACCOUNTS REQUIRED
          </div>
        </div>

        {/* Totals Summary and Validation Block */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded bg-[#09090b] border border-zinc-800 font-sans">
          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Debits</div>
            <div className="text-base font-bold text-zinc-300 font-mono mt-0.5">
              {formatCurrency(totalDebitsCents)}
            </div>
          </div>

          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Credits</div>
            <div className="text-base font-bold text-zinc-300 font-mono mt-0.5">
              {formatCurrency(totalCreditsCents)}
            </div>
          </div>

          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Difference</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${differenceCents === 0 ? 'text-zinc-400' : 'text-amber-400'}`}>
              {formatCurrency(differenceCents)}
            </div>
          </div>

          <div className="flex items-center justify-end">
            {isBalanced ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/20 text-blue-400 border border-blue-800/20 rounded text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-450" />
                <span>Balanced Voucher</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/20 text-amber-405 border border-amber-855/30 rounded text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Asymmetric Entries</span>
              </div>
            )}
          </div>
        </div>

        {/* Unbalanced Warning Banner */}
        {!isBalanced && (
          <div className="p-3 bg-amber-950/15 border border-amber-900/30 text-amber-400 rounded text-xs flex items-center gap-2" id="imbalance-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" />
            <span>
              <strong>Validation Alert:</strong> The 'Post Journal Entry' button remains deactivated because your entries are unbalanced. Total Debits ({formatCurrency(totalDebitsCents)}) must exactly equal Total Credits ({formatCurrency(totalCreditsCents)}) and be greater than zero.
            </span>
          </div>
        )}

        {/* Form Action Controls */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isPosting}
            onClick={() => {
              setReference('');
              setDescription('');
              if (liveAccounts && liveAccounts.length >= 2) {
                setRows([
                  { id: 'row-1', accountId: liveAccounts[0].id, debitStr: '', creditStr: '' },
                  { id: 'row-2', accountId: liveAccounts[Math.min(6, liveAccounts.length - 1)].id, debitStr: '', creditStr: '' },
                ]);
              }
            }}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-805 text-zinc-450 hover:text-zinc-300 rounded border border-zinc-800 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Clear Draft
          </button>
          <button
            type="submit"
            disabled={!isBalanced || isPosting}
            className={`px-5 py-2 rounded text-xs font-semibold text-white transition-all ${
              (isBalanced && !isPosting)
                ? 'bg-blue-600 hover:bg-blue-755 cursor-pointer active:scale-98' 
                : 'bg-zinc-800 text-zinc-600 border border-zinc-900 cursor-not-allowed'
            }`}
          >
            {isPosting ? 'Posting transaction...' : 'Post Journal Entry'}
          </button>
        </div>

      </form>
    </div>
  );
}
