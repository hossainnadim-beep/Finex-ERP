/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Account, JournalEntry, AccountClass, NormalBalanceType, mapDbAccount } from '../types';
import { useAuth } from '../AuthContext';
import { 
  Database, 
  Search, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  Coins, 
  Layers, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  BookOpen
} from 'lucide-react';

interface ChartOfAccountsProps {
  accounts: Account[];
  entries: JournalEntry[];
  isLoading: boolean;
  source: 'local' | 'supabase' | 'supabase-empty';
  onRefresh: () => void;
  onSeed: () => void;
  onCreateAccount: (newAccount: Account) => Promise<boolean>;
}

export default function ChartOfAccounts({
  accounts,
  entries,
  isLoading,
  source,
  onRefresh,
  onSeed,
  onCreateAccount,
}: ChartOfAccountsProps) {
  const { supabase } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeClass, setActiveClass] = useState<AccountClass | 'All'>('All');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Live accounts state fetched using Supabase client in useEffect
  const [liveAccounts, setLiveAccounts] = useState<Account[]>([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveAccountsFromDb = async () => {
      setLiveLoading(true);
      setFetchError(null);
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .order('id', { ascending: true });

          if (isMounted) {
            if (error) {
              setFetchError(error.message);
              setLiveAccounts(accounts);
            } else if (data && data.length > 0) {
              const mapped = data.map(mapDbAccount);
              // Merge db accounts with the latest state of accounts to support local fallback seamlessly
              const merged = [...mapped];
              accounts.forEach(acc => {
                if (!merged.some(m => m.id === acc.id)) {
                  merged.push(acc);
                }
              });
              setLiveAccounts(merged.sort((a, b) => a.id.localeCompare(b.id)));
            } else {
              setLiveAccounts(accounts);
            }
          }
        } else {
          if (isMounted) {
            setLiveAccounts(accounts);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.message || 'Unable to scan cloud ledger database');
          setLiveAccounts(accounts);
        }
      } finally {
        if (isMounted) {
          setLiveLoading(false);
        }
      }
    };

    fetchLiveAccountsFromDb();

    return () => {
      isMounted = false;
    };
  }, [accounts]);

  // Form states for adding custom Account
  const [newId, setNewId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newClass, setNewClass] = useState<AccountClass>('Asset');
  const [newNormal, setNewNormal] = useState<NormalBalanceType>('Debit');
  const [newDesc, setNewDesc] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);
  const [savingAccount, setSavingAccount] = useState<boolean>(false);

  // Auto-detect normal balance on class modification to be helpful
  const handleClassChange = (cls: AccountClass) => {
    setNewClass(cls);
    if (cls === 'Asset' || cls === 'Expense') {
      setNewNormal('Debit');
    } else {
      setNewNormal('Credit');
    }
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const codeToCheck = newId.trim();
    if (!codeToCheck || !newName.trim()) {
      setFormError('Account code and account name are mandatory fields.');
      return;
    }

    if (!/^\d{4,6}$/.test(codeToCheck)) {
      setFormError('Account code must be a numeric string between 4 to 6 digits (e.g., 1050, 5040).');
      return;
    }

    // GAAP compliant numeric range prefix checks to make it highly consistent with the system
    const firstDigit = codeToCheck[0];
    if (newClass === 'Asset' && firstDigit !== '1') {
      setFormError('Asset account codes must start with 1 (e.g. 1000 - 1999) to keep the ledger consistent.');
      return;
    }
    if (newClass === 'Liability' && firstDigit !== '2') {
      setFormError('Liability account codes must start with 2 (e.g. 2000 - 2999) to keep the ledger consistent.');
      return;
    }
    if (newClass === 'Equity' && firstDigit !== '3') {
      setFormError('Equity account codes must start with 3 (e.g. 3000 - 3999) to keep the ledger consistent.');
      return;
    }
    if (newClass === 'Revenue' && firstDigit !== '4') {
      setFormError('Revenue account codes must start with 4 (e.g. 4000 - 4999) to keep the ledger consistent.');
      return;
    }
    if (newClass === 'Expense' && !['5', '6', '7', '8', '9'].includes(firstDigit)) {
      setFormError('Expense account codes must start with 5, 6, 7, 8, or 9 (e.g. 5000 - 9999) to keep the ledger consistent.');
      return;
    }

    // Search similarity and perfect matches across online database and local active state
    const isConflict = 
      liveAccounts.some(a => a.id === codeToCheck || a.id.toLowerCase() === codeToCheck.toLowerCase()) ||
      accounts.some(a => a.id === codeToCheck || a.id.toLowerCase() === codeToCheck.toLowerCase());

    if (isConflict) {
      setFormError(`An account with general ledger code #${codeToCheck} is already registered. Please choose a completely unique code.`);
      return;
    }

    setSavingAccount(true);
    try {
      const added = await onCreateAccount({
        id: newId.trim(),
        name: newName.trim(),
        class: newClass,
        normalBalance: newNormal,
        description: newDesc.trim() || `${newName.trim()} description.`
      });

      if (added) {
        setFormSuccess(true);
        // Clear inputs
        setNewId('');
        setNewName('');
        setNewDesc('');
        setTimeout(() => {
          setShowAddForm(false);
          setFormSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Fatal error while saving account general ledger row.');
    } finally {
      setSavingAccount(false);
    }
  };

  // Compute account balances dynamically in real time
  const accountBalances = useMemo(() => {
    const balances: Record<string, { debits: number; credits: number; final: number }> = {};

    // Initialize all existing accounts in list
    liveAccounts.forEach(acc => {
      balances[acc.id] = { debits: 0, credits: 0, final: 0 };
    });

    // Enforce calculation from double entries
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (!balances[line.accountId]) {
          balances[line.accountId] = { debits: 0, credits: 0, final: 0 };
        }
        balances[line.accountId].debits += line.debit;
        balances[line.accountId].credits += line.credit;
      });
    });

    // Calculate normal balance values
    liveAccounts.forEach(acc => {
      const b = balances[acc.id] || { debits: 0, credits: 0, final: 0 };
      if (acc.normalBalance === 'Debit') {
        b.final = b.debits - b.credits;
      } else {
        b.final = b.credits - b.debits;
      }
    });

    return balances;
  }, [entries, liveAccounts]);

  // Handle Search and Classification filters
  const filteredAccounts = useMemo(() => {
    return liveAccounts.filter(acc => {
      // Classification filter
      if (activeClass !== 'All' && acc.class !== activeClass) {
        return false;
      }

      // Search matching code name or description
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchCode = acc.id.includes(term);
        const matchName = acc.name.toLowerCase().includes(term);
        const matchDesc = acc.description?.toLowerCase().includes(term);
        return matchCode || matchName || matchDesc;
      }

      return true;
    });
  }, [liveAccounts, searchTerm, activeClass]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      
      {/* Title & DB Synchronization Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Coins className="h-4.5 w-4.5 text-blue-500" /> General Ledger Chart of Accounts
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Define and monitor the structural financial balance targets</p>
        </div>

        <div className="flex items-center gap-2">
          {/* DB Status Label */}
          {source === 'supabase' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded font-mono">
              <Database className="w-3 h-3" /> Supabase Synced Table
            </span>
          )}
          {source === 'supabase-empty' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded font-mono">
              <Database className="w-3 h-3" /> Supabase Empty Table
            </span>
          )}
          {source === 'local' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold uppercase rounded font-mono">
              <Database className="w-3 h-3" /> Local Sandbox Fallback
            </span>
          )}

          {/* Action Control Icon buttons */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 hover:border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Refresh accounts from Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setFormSuccess(false);
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-md shadow-blue-900/10 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {/* Supabase Empty Seeding Panel Notice */}
      {source === 'supabase-empty' && (
        <div className="p-5 bg-gradient-to-r from-amber-950/15 via-zinc-900 to-[#121214] border border-amber-800/30 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-200 block">Supabase accounts table detected but empty</span>
              <p className="text-zinc-400 leading-relaxed max-w-xl mt-1">
                Your connection to Supabase finex-project is authentic, but the table contains zero operational categories. Seeding will write the 11 baseline accounting classifications (Assets, Liabilities, Equity) in standard accounts automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onSeed}
            disabled={isLoading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold uppercase tracking-wider text-[10px] rounded shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Seeding...' : 'Seed Baseline Chart'}
          </button>
        </div>
      )}

      {/* Local Fallback Telemetry Warning */}
      {source === 'local' && (
        <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded text-xs text-zinc-400 font-sans leading-relaxed">
          💡 <strong>Setup Guidance:</strong> Operating in sandbox fallback dataset mode. To read directly from your personal live Supabase database: create an <code className="font-mono bg-zinc-950 px-1 text-zinc-300">accounts</code> table with columns <code className="font-mono bg-zinc-950 px-1 text-zinc-300">id (text, PK)</code>, <code className="font-mono bg-[#09090b] px-1 text-zinc-205">name (text)</code>, <code className="font-mono bg-[#09090b] px-1 text-zinc-205">class (text)</code>, <code className="font-mono bg-[#09090b] px-1 text-zinc-205">normalBalance (text)</code>, <code className="font-mono bg-[#09090b] px-1 text-zinc-205">description (text)</code> in your database cluster, or copy the values in Connection Config.
        </div>
      )}

      {/* Add Account Expandable Form Workspace */}
      {showAddForm && (
        <form 
          onSubmit={handleAddAccountSubmit} 
          className="p-5 bg-[#121214] rounded border border-zinc-800 font-sans space-y-4 shadow-xl animate-fade-in"
        >
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Register General Ledger Account Form</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            
            {/* Account Code / ID */}
            <div className="space-y-1.5">
              <label className="block text-zinc-400 font-semibold">Account Code (numeric)</label>
              <input
                type="text"
                placeholder="e.g., 1050, 5040"
                value={newId}
                onChange={e => setNewId(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200 font-mono"
              />
            </div>

            {/* Account Name */}
            <div className="space-y-1.5">
              <label className="block text-zinc-400 font-semibold">Account Name</label>
              <input
                type="text"
                placeholder="e.g., Petty Cash Box, Software Income"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
              />
            </div>

            {/* Account Classification */}
            <div className="space-y-1.5">
              <label className="block text-zinc-400 font-semibold">Account Classification</label>
              <select
                value={newClass}
                onChange={e => handleClassChange(e.target.value as AccountClass)}
                className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            {/* Normal Balance direction */}
            <div className="space-y-1.5">
              <label className="block text-zinc-400 font-semibold">Normal Balance Type</label>
              <select
                value={newNormal}
                onChange={e => setNewNormal(e.target.value as NormalBalanceType)}
                className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
              >
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

          </div>

          {/* Optional description */}
          <div className="space-y-1.5 text-xs">
            <label className="block text-zinc-400 font-semibold">Purpose &amp; Description</label>
            <input
              type="text"
              placeholder="e.g., Capital accounting for cash reserves, outstanding credit notes, hardware capital..."
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
            />
          </div>

          {/* Form diagnostics reports overlay */}
          {formError && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>General ledger account created successfully!</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setFormSuccess(false);
                setShowAddForm(false);
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              {savingAccount ? 'Writing row...' : 'Register Account'}
            </button>
          </div>

        </form>
      )}

      {/* Search Input, Filtering Actions Pills */}
      <div className="bg-[#121214] p-4 rounded border border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 select-none">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search account name, code, description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none text-xs rounded text-zinc-200 placeholder-zinc-500 font-sans"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-450 leading-none">
          <button
            onClick={() => setActiveClass('All')}
            className={`px-3 py-1.5 rounded transition-colors font-medium border cursor-pointer ${
              activeClass === 'All'
                ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                : 'bg-transparent border-transparent hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            All Accounts
          </button>
          {(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as AccountClass[]).map(cls => (
            <button
              key={cls}
              onClick={() => setActiveClass(cls)}
              className={`px-3 py-1.5 rounded transition-colors font-medium border cursor-pointer ${
                activeClass === cls
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
                  : 'bg-transparent border-transparent hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              {cls}s
            </button>
          ))}
        </div>
      </div>

      {/* Main Accounts searchable registry table */}
      <div className="bg-[#121214] border border-zinc-800 rounded shadow-md overflow-hidden font-sans">
        
        {(isLoading || liveLoading) && liveAccounts.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
            <p>Loading accounts from Supabase query endpoint...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <Layers className="h-6 w-6 mx-auto text-zinc-650 mb-2" />
            <p>No operational accounts found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Tiny live status fetching loader pill */}
            {(isLoading || liveLoading) && (
              <div className="bg-blue-950/20 text-blue-400 text-[10px] px-5 py-2 flex items-center gap-2 border-b border-zinc-800 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span>Re-syncing with live Supabase database accounts table...</span>
              </div>
            )}
            <table className="min-w-full divide-y divide-zinc-800 text-xs">
              
              <thead className="bg-[#09090b] text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Account Code</th>
                  <th className="px-5 py-3 text-left">Account Name</th>
                  <th className="px-5 py-3 text-left">Account Type</th>
                  <th className="px-5 py-3 text-left">Normal Balance</th>
                  <th className="px-5 py-3 text-right">Debit Balance</th>
                  <th className="px-5 py-3 text-right">Credit Balance</th>
                  <th className="px-5 py-3 text-right">Account Balance</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-850/60 text-zinc-350">
                {filteredAccounts.map(account => {
                  const balObj = accountBalances[account.id] || { debits: 0, credits: 0, final: 0 };
                  const isCurrentAccountBalanced = formatCurrency(balObj.final);
                  return (
                    <tr key={account.id} className="hover:bg-zinc-905/45 transition-colors group">
                      
                      {/* Code */}
                      <td className="px-5 py-3 font-mono font-bold text-zinc-400 group-hover:text-zinc-200">
                        #{account.id}
                      </td>

                      {/* Name & Description */}
                      <td className="px-5 py-3">
                        <span className="font-semibold text-zinc-200 block">{account.name}</span>
                        {account.description && (
                          <span className="text-[10px] text-zinc-500 block max-w-sm font-sans leading-relaxed truncate mt-0.5" title={account.description}>
                            {account.description}
                          </span>
                        )}
                      </td>

                      {/* Class */}
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase leading-none font-bold font-mono tracking-wider ${
                          account.class === 'Asset' ? 'bg-blue-950/40 text-blue-300 border border-blue-900/30' :
                          account.class === 'Liability' ? 'bg-red-950/40 text-red-305 border border-red-900/30' :
                          account.class === 'Equity' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/30' :
                          account.class === 'Revenue' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40' :
                          'bg-amber-950/40 text-amber-305 border border-amber-905/30'
                        }`}>
                          {account.class}
                        </span>
                      </td>

                      {/* Normal Balance */}
                      <td className="px-5 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        {account.normalBalance}
                      </td>

                      {/* Total Debits */}
                      <td className="px-5 py-3 text-right font-mono text-zinc-400 text-[11px]">
                        {formatCurrency(balObj.debits)}
                      </td>

                      {/* Total Credits */}
                      <td className="px-5 py-3 text-right font-mono text-zinc-400 text-[11px]">
                        {formatCurrency(balObj.credits)}
                      </td>

                      {/* Net Account Balance */}
                      <td className="px-5 py-3 text-right font-mono font-bold text-zinc-100 text-[11px]">
                        <span className={balObj.final > 0 ? 'text-zinc-200' : 'text-zinc-400'}>
                          {isCurrentAccountBalanced}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}

        {/* Counter footer */}
        <div className="bg-[#09090b] text-[10px] font-mono text-zinc-500 px-5 py-3 border-t border-zinc-800 uppercase tracking-wider flex items-center justify-between">
          <span>Displaying {filteredAccounts.length} of {liveAccounts.length} operational accounts</span>
          <span>Finex ERP GAAP Compliant Registry</span>
        </div>

      </div>

    </div>
  );
}
