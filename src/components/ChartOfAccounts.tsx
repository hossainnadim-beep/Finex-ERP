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
  Coins, 
  Layers, 
  CheckCircle, 
  AlertTriangle,
  BookOpen,
  Edit2,
  Trash2,
  Info
} from 'lucide-react';

interface ChartOfAccountsProps {
  accounts: Account[];
  entries: JournalEntry[];
  isLoading: boolean;
  source: 'local' | 'supabase' | 'supabase-empty';
  onRefresh: () => void;
  onSeed: () => void;
  onCreateAccount: (newAccount: Account) => Promise<boolean>;
  onUpdateAccount?: (targetId: string, updatedAccount: Account) => Promise<boolean>;
  onDeleteAccount?: (id: string) => Promise<boolean>;
}

export default function ChartOfAccounts({
  accounts,
  entries,
  isLoading,
  source,
  onRefresh,
  onSeed,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}: ChartOfAccountsProps) {
  const { supabase, session } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeClass, setActiveClass] = useState<AccountClass | 'All'>('All');
  
  // Modals visibility toggles
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Live accounts state fetched using Supabase client in useEffect
  const [liveAccounts, setLiveAccounts] = useState<Account[]>([]);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch accounts from database or rely on fallback props
  const fetchLiveAccountsFromDb = async () => {
    setLiveLoading(true);
    setFetchError(null);
    try {
      if (supabase) {
        let query = supabase.from('accounts').select('*');
        if (session?.user?.id) {
          query = query.eq('user_id', session.user.id);
        }
        const { data, error } = await query.order('id', { ascending: true });

        if (error) {
          setFetchError(error.message);
          setLiveAccounts(accounts);
        } else if (data && data.length > 0) {
          const mapped = data.map(mapDbAccount);
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
      } else {
        setLiveAccounts(accounts);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Unable to load ledger accounts');
      setLiveAccounts(accounts);
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAccountsFromDb();
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

  // States for Editing Account
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editClass, setEditClass] = useState<AccountClass>('Asset');
  const [editNormal, setEditNormal] = useState<NormalBalanceType>('Debit');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [updatingAccount, setUpdatingAccount] = useState<boolean>(false);

  // States for Deleting Account
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false);

  // Auto-detect normal balance on class modification to be helpful
  const handleClassChange = (cls: AccountClass) => {
    setNewClass(cls);
    if (cls === 'Asset' || cls === 'Expense') {
      setNewNormal('Debit');
    } else {
      setNewNormal('Credit');
    }
  };

  const handleEditClassChange = (cls: AccountClass) => {
    setEditClass(cls);
    if (cls === 'Asset' || cls === 'Expense') {
      setEditNormal('Debit');
    } else {
      setEditNormal('Credit');
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
        await fetchLiveAccountsFromDb();
        setTimeout(() => {
          setShowAddModal(false);
          setFormSuccess(false);
        }, 1200);
      }
    } catch (err: any) {
      setFormError(err.message || 'Fatal error while saving account general ledger row.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Account name is required.');
      return;
    }

    setUpdatingAccount(true);
    try {
      if (onUpdateAccount) {
        const success = await onUpdateAccount(editingAccount.id, {
          id: editingAccount.id,
          name: editName.trim(),
          class: editClass,
          normalBalance: editNormal,
          description: editDesc.trim() || `${editName.trim()} description.`
        });

        if (success) {
          await fetchLiveAccountsFromDb();
          setEditingAccount(null);
        } else {
          setEditError('Failed to update general ledger account details.');
        }
      } else {
        setEditError('System update callback handler not registered.');
      }
    } catch (err: any) {
      setEditError(err?.message || 'Error occurred while saving changes.');
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleDeleteAccountSubmit = async () => {
    if (!deletingId) return;
    setDeleteError(null);
    setDeletingLoading(true);

    try {
      if (onDeleteAccount) {
        const success = await onDeleteAccount(deletingId);
        if (success) {
          await fetchLiveAccountsFromDb();
          setDeletingId(null);
        } else {
          setDeleteError('Failed to remove ledger account from database.');
        }
      } else {
        setDeleteError('System delete callback handler not registered.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error occurred while deleting account.');
    } finally {
      setDeletingLoading(false);
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
      
      {/* Title & Organization Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Coins className="h-4.5 w-4.5 text-blue-500" /> Chart of Accounts
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">View and customize your company's accounting ledger and categories</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Control Icon buttons */}
          <button
            onClick={() => {
              onRefresh();
              fetchLiveAccountsFromDb();
            }}
            disabled={isLoading || liveLoading}
            className="p-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 hover:border-zinc-700 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer disabled:opacity-40"
            title="Sync accounts list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading || liveLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setFormSuccess(false);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-md shadow-blue-900/10 cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {/* Baseline Seeding Notice */}
      {source === 'supabase-empty' && (
        <div className="p-5 bg-gradient-to-r from-amber-950/15 via-zinc-900 to-[#121214] border border-zinc-800/80 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs animate-fade-in">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-200 block">Your Chart of Accounts is currently empty</span>
              <p className="text-zinc-400 leading-relaxed max-w-xl mt-1">
                Begin setting up your general ledger by generating a standard baseline chart of accounts. This automatically populates common accounts like Cash, Accounts Receivable, and Sales Revenue.
              </p>
            </div>
          </div>
          <button
            onClick={onSeed}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-[10px] rounded shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Setting up...' : 'Setup Standard Accounts'}
          </button>
        </div>
      )}

      {/* Search Input, Filtering Actions Pills */}
      <div className="bg-[#121214] p-4 rounded border border-zinc-805 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 select-none">
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
            <p>Loading accounts list...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            <Layers className="h-6 w-6 mx-auto text-zinc-650 mb-2" />
            <p>No accounts found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Tiny live status fetching loader pill */}
            {(isLoading || liveLoading) && (
              <div className="bg-blue-950/20 text-blue-400 text-[10px] px-5 py-2 flex items-center gap-2 border-b border-zinc-800 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span>Syncing general ledger accounts...</span>
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
                  <th className="px-5 py-3 text-center w-24">Actions</th>
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

                      {/* Actions cell */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingAccount(account);
                              setEditName(account.name);
                              setEditClass(account.class);
                              setEditNormal(account.normalBalance);
                              setEditDesc(account.description || '');
                              setEditError(null);
                            }}
                            className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800/80 rounded transition-colors cursor-pointer"
                            title={`Edit ${account.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setDeletingId(account.id);
                              setDeleteError(null);
                            }}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 rounded transition-colors cursor-pointer"
                            title={`Delete ${account.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
          <span>Displaying {filteredAccounts.length} of {liveAccounts.length} accounts</span>
          <span>Finex ERP Registry</span>
        </div>

      </div>

      {/* ================= MODAL: ADD ACCOUNT (Part 2.1) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
          {/* Backdrop screen lock mask */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setShowAddModal(false)}
          />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-[#121214] border border-zinc-805 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              
              <form onSubmit={handleAddAccountSubmit} className="space-y-4">
                
                {/* Modal Header */}
                <div className="bg-[#09090b] px-6 py-4 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-250">Create General Ledger Account</h3>
                      <p className="text-[10px] text-zinc-500">Register a new customizable catalog item</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="text-zinc-500 hover:text-white font-mono text-sm leading-none cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-2 space-y-4 text-xs">
                  
                  {/* Account Code / ID */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-semibold">Account Code (numeric)</label>
                    <input
                      type="text"
                      placeholder="e.g., 1050, 2020, 5040"
                      value={newId}
                      onChange={e => setNewId(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200 font-mono"
                    />
                    <span className="text-[10px] text-zinc-500 block leading-normal">
                      Must be a 4-6 digit sequence: Assets starts with 1, Liabilities with 2, Equity with 3, Revenue with 4, Expense with 5-9.
                    </span>
                  </div>

                  {/* Account Name */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-semibold">Account Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Cash Drawer Balance, Hardware Expenses"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200 font-sans"
                    />
                  </div>

                  {/* Class & Direction Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Account Type/Classification */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-semibold">Account Type</label>
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
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-semibold">Purpose &amp; Description</label>
                    <textarea
                      placeholder="Traceable context describing this specific category..."
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200 font-sans resize-none"
                    />
                  </div>

                  {/* Diagnostic warnings */}
                  {formError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Account created successfully!</span>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="bg-[#09090b] px-6 py-4 flex justify-end gap-2 text-xs border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAccount}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {savingAccount ? 'Saving...' : 'Create Account'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT ACCOUNT (Part 2.2) ================= */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
          {/* Backdrop screen lock mask */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingAccount(null)}
          />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-[#121214] border border-zinc-805 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              
              <form onSubmit={handleEditAccountSubmit} className="space-y-4">
                
                {/* Modal Header */}
                <div className="bg-[#09090b] px-6 py-4 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-250">Edit Account #{editingAccount.id}</h3>
                      <p className="text-[10px] text-zinc-500">Modify accounting ledger account details</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditingAccount(null)}
                    className="text-zinc-500 hover:text-white font-mono text-sm leading-none cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-2 space-y-4 text-xs">
                  
                  {/* Account Code (READONLY) */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-500 font-semibold">Account Code (Read-Only)</label>
                    <input
                      type="text"
                      disabled
                      value={editingAccount.id}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-zinc-450 font-mono cursor-not-allowed"
                    />
                  </div>

                  {/* Account Name */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-semibold">Account Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Main Checking, Cash Float"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
                    />
                  </div>

                  {/* Class & Direction Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Account Type/Classification */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-semibold">Account Type</label>
                      <select
                        value={editClass}
                        onChange={e => handleEditClassChange(e.target.value as AccountClass)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
                      >
                        <option value="Asset">Asset</option>
                        <option value="Liability">Liability</option>
                        <option value="Equity">Equity</option>
                        <option value="Revenue">Option</option>
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                      </select>
                    </div>

                    {/* Normal Balance direction */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-400 font-semibold">Normal Balance Type</label>
                      <select
                        value={editNormal}
                        onChange={e => setEditNormal(e.target.value as NormalBalanceType)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200"
                      >
                        <option value="Debit">Debit</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </div>
                  </div>

                  {/* description */}
                  <div className="space-y-1.5">
                    <label className="block text-zinc-400 font-semibold">Purpose &amp; Description</label>
                    <textarea
                      placeholder="Traceable context describing this specific category..."
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-705 focus:outline-none p-2 rounded text-zinc-200 font-sans resize-none"
                    />
                  </div>

                  {/* Diagnostic warnings */}
                  {editError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="bg-[#09090b] px-6 py-4 flex justify-end gap-2 text-xs border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingAccount}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {updatingAccount ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM DELETE (Part 2.2) ================= */}
      {deletingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
          {/* Backdrop screen lock mask */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setDeletingId(null)}
          />

          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-[#121214] border border-red-900/45 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
              
              <div className="space-y-4">
                
                {/* Modal Header */}
                <div className="bg-[#09090b] px-6 py-4 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Confirm Deletion</h3>
                      <p className="text-[10px] text-zinc-500">Permanently delete account category from ledger</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setDeletingId(null)}
                    className="text-zinc-500 hover:text-white font-mono text-sm leading-none cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-2 space-y-3 text-xs leading-relaxed text-zinc-300">
                  <p>
                    Are you absolutely sure you want to permanently delete account general ledger category <strong className="font-mono text-white">#{deletingId}</strong>?
                  </p>
                  <p className="border-l-2 border-red-500/50 pl-3 py-1 bg-red-950/10 text-red-200">
                    Warning: Delete is irreversible. If this account is already mapped inside transaction records, deletion will be blocked to preserve balanced entry data.
                  </p>

                  {/* Diagnostic warnings */}
                  {deleteError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{deleteError}</span>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="bg-[#09090b] px-6 py-4 flex justify-end gap-2 text-xs border-t border-red-950/30">
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccountSubmit}
                    disabled={deletingLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-semibold transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {deletingLoading ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
