/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserSession, JournalEntry, JournalLine, AuditLog, Account, mapDbAccount } from './types';
import { INITIAL_JOURNAL_ENTRIES, CHART_OF_ACCOUNTS } from './constants';
import SupabaseAuth from './components/SupabaseAuth';
import JournalEntryForm from './components/JournalEntryForm';
import LedgerTable from './components/LedgerTable';
import ChartOfAccounts from './components/ChartOfAccounts';
import DashboardOverview from './components/DashboardOverview';
import ComplianceReports from './components/ComplianceReports';
import ConnectivityStatus from './components/ConnectivityStatus';
import AuditHistory from './components/AuditHistory';
import InvoicesView from './components/InvoicesView';
import { useAuth, ProtectedRoute } from './AuthContext';
import { 
  LogOut, 
  Database, 
  UserCheck, 
  Globe,
  Settings,
  LayoutDashboard,
  Coins,
  FileSpreadsheet,
  BarChart3,
  Menu,
  X,
  ShieldCheck,
  History,
  FileText
} from 'lucide-react';

export default function App() {
  const { session, setSession, logout, supabase } = useAuth();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dbColumns, setDbColumns] = useState<string[]>([]);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'invoices' | 'journal' | 'reports' | 'settings' | 'audit'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Dynamic ledger accounts state (loaded from Supabase or fallback defaults)
  const getLocalSandboxAccounts = (): Account[] => {
    try {
      const saved = localStorage.getItem('conexerp_sandbox_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error fetching/parsing sandbox accounts:', e);
    }
    return CHART_OF_ACCOUNTS;
  };

  const [accounts, setAccounts] = useState<Account[]>(getLocalSandboxAccounts());
  const [accountsLoading, setAccountsLoading] = useState<boolean>(false);
  const [accountsSource, setAccountsSource] = useState<'local' | 'supabase' | 'supabase-empty'>('local');

  // Load initial data & restore local storage backup for sandbox
  useEffect(() => {
    // 1. Recover customize accounts layout from localStorage
    const savedSandboxAccounts = localStorage.getItem('conexerp_sandbox_accounts');
    if (savedSandboxAccounts) {
      try {
        const parsedAccts = JSON.parse(savedSandboxAccounts);
        if (Array.isArray(parsedAccts) && parsedAccts.length > 0) {
          setAccounts(parsedAccts);
        }
      } catch (e) {
        console.error('Error loading sandbox accounts:', e);
      }
    }

    // 2. Recover custom journal entries list from local storage backup
    const savedSandboxJE = localStorage.getItem('conexerp_sandbox_journal_entries');
    let initialJEList = INITIAL_JOURNAL_ENTRIES;
    if (savedSandboxJE) {
      try {
        const parsedJE = JSON.parse(savedSandboxJE);
        if (Array.isArray(parsedJE) && parsedJE.length > 0) {
          initialJEList = parsedJE;
          setJournalEntries(parsedJE);
        } else {
          setJournalEntries(INITIAL_JOURNAL_ENTRIES);
        }
      } catch (e) {
        console.error('Error loading sandbox journal entries:', e);
        setJournalEntries(INITIAL_JOURNAL_ENTRIES);
      }
    } else {
      setJournalEntries(INITIAL_JOURNAL_ENTRIES);
    }
    
    // 3. Recover business action audit logs list from local storage backup
    const savedSandboxLogs = localStorage.getItem('conexerp_sandbox_audit_logs');
    let initialLogsList: AuditLog[] = [];
    if (savedSandboxLogs) {
      try {
        const parsedLogs = JSON.parse(savedSandboxLogs);
        if (Array.isArray(parsedLogs) && parsedLogs.length > 0) {
          initialLogsList = parsedLogs;
          setAuditLogs(parsedLogs);
        }
      } catch (e) {
        console.error('Error loading sandbox audit logs:', e);
      }
    }

    if (initialLogsList.length === 0) {
      // Bootstrap initial audit ledger logs
      initialLogsList = [
        {
          id: 'L-INIT-01',
          timestamp: new Date(Date.now() - 360000000).toISOString(),
          action: 'CREATE',
          actor: 'audit-automaton@finexerp.io',
          details: 'Enterprise Ledger environment initialized. Chart of Accounts registered in database.'
        },
        ...initialJEList.map((entry, idx) => ({
          id: `L-INIT-JE-${idx}`,
          timestamp: entry.createdAt,
          action: 'CREATE' as const,
          actor: entry.createdBy,
          details: `Imported initial historical journal entry block ref: ${entry.reference}. Balanced amount: $${(entry.lines.reduce((s, c) => s + c.debit, 0) / 100).toFixed(2)}`,
          targetId: entry.id
        }))
      ];
      setAuditLogs(initialLogsList);
      localStorage.setItem('conexerp_sandbox_audit_logs', JSON.stringify(initialLogsList));
    }
  }, []);

  // Log successful login events when session state is registered and active
  useEffect(() => {
    if (session) {
      const email = session.user?.email || 'unknown@user.com';
      const authLog: AuditLog = {
        id: `L-AUTH-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: session.mode === 'supabase' ? 'AUTH_SIGN_IN' : 'AUTH_SIGN_UP',
        actor: email,
        details: `Successful auth handshake established in [${session.mode.toUpperCase()}] mode.`
      };
      setAuditLogs(prev => {
        const duplicate = prev.some(l => 
          l.id.startsWith('L-AUTH-') && 
          l.actor === email && 
          Math.abs(new Date(l.timestamp).getTime() - new Date(authLog.timestamp).getTime()) < 5000
        );
        if (duplicate) return prev;
        return [authLog, ...prev];
      });
    }
  }, [session]);

  // Synchronized Simulation Audit Log writer - mimics PG SQL triggers in sandbox/local fallback
  const writeLocalDbAuditLog = (
    tableName: string,
    actionType: 'INSERT' | 'UPDATE' | 'DELETE' | string,
    recordId: string,
    oldData: any,
    newData: any
  ) => {
    try {
      const savedLocalDb = localStorage.getItem('conexerp_sandbox_audit_logs_db');
      let currentLogs: any[] = [];
      if (savedLocalDb) {
        currentLogs = JSON.parse(savedLocalDb);
      }
      
      const newLogObj = {
        id: `aud-loc-${Date.now()}-${Math.random().toString().slice(-4)}`,
        table_name: tableName,
        record_id: recordId,
        action_type: actionType,
        old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
        changed_by: session?.user?.email || 'sandbox-auditor@enterprise.io',
        changed_at: new Date().toISOString()
      };
      
      const updatedLogs = [newLogObj, ...currentLogs];
      localStorage.setItem('conexerp_sandbox_audit_logs_db', JSON.stringify(updatedLogs));
      
      // Broadcast this change so other tabs reload instantly!
      const syncChannel = new BroadcastChannel('conexerp_sync_channel');
      syncChannel.postMessage({ type: 'SYNC_STATE_TRIGGER' });
      syncChannel.close();
    } catch (e) {
      console.error('Error writing local Db audit log:', e);
    }
  };

  // 1) Handle real-time multi-user synchronization between browser tabs (Sandbox & Backup mode)
  useEffect(() => {
    const syncChannel = new BroadcastChannel('conexerp_sync_channel');
    
    syncChannel.onmessage = (event) => {
      console.log('Realtime Tab Sync Handshake:', event.data);
      const { type } = event.data || {};
      
      if (type === 'SYNC_STATE_TRIGGER') {
        // Read updated lists from localStorage in other tabs immediately
        const savedAccounts = localStorage.getItem('conexerp_sandbox_accounts');
        if (savedAccounts) {
          try {
            const parsed = JSON.parse(savedAccounts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAccounts(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        const savedJE = localStorage.getItem('conexerp_sandbox_journal_entries');
        if (savedJE) {
          try {
            const parsed = JSON.parse(savedJE);
            if (Array.isArray(parsed)) {
              setJournalEntries(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        }
        
        const savedLogs = localStorage.getItem('conexerp_sandbox_audit_logs');
        if (savedLogs) {
          try {
            const parsed = JSON.parse(savedLogs);
            if (Array.isArray(parsed)) {
              setAuditLogs(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    return () => {
      syncChannel.close();
    };
  }, []);

  // 2) Handle real-time cloud database changes from Supabase publication triggers (Multi-device sync)
  useEffect(() => {
    if (session?.mode === 'supabase' && supabase) {
      console.log('Initializing Postgres Realtime connections on public publication channel...');
      
      const channel = supabase
        .channel('realtime_ledger_changes')
        // Listen to INSERT, UPDATE, DELETE on accounts
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts'
          },
          async (payload) => {
            console.log('Cloud Sync Event: accounts changed ->', payload);
            await fetchAccountsFromSupabase();
          }
        )
        // Listen to journal_entries
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'journal_entries'
          },
          async (payload) => {
            console.log('Cloud Sync Event: journal_entries changed ->', payload);
            await fetchJournalEntriesFromSupabase();
          }
        )
        // Listen to journal_lines
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'journal_lines'
          },
          async (payload) => {
            console.log('Cloud Sync Event: journal_lines changed ->', payload);
            await fetchJournalEntriesFromSupabase();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, supabase]);

  // Fetch journal entries and related lines from Supabase
  const fetchJournalEntriesFromSupabase = async (fetchedAccounts: Account[] = accounts) => {
    if (session?.mode === 'supabase' && supabase) {
      try {
        const { data: dbEntries, error: errE } = await supabase
          .from('journal_entries')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (errE) {
          console.warn('journal_entries fetch failed:', errE.message);
          return;
        }

        const { data: dbLines, error: errL } = await supabase
          .from('journal_lines')
          .select('*');

        if (errL) {
          console.warn('journal_lines fetch failed:', errL.message);
          return;
        }

        const mappedEntries: JournalEntry[] = (dbEntries || []).map(entry => {
          const entryLines = (dbLines || [])
            .filter((l: any) => l.journal_entry_id === entry.id)
            .map((l: any) => {
              const matchedAcct = fetchedAccounts.find(a => a.dbId === l.account_id);
              return {
                id: l.id,
                accountId: matchedAcct ? matchedAcct.id : l.account_id,
                debit: Number(l.debit_amount || 0),
                credit: Number(l.credit_amount || 0)
              };
            });

          return {
            id: entry.id,
            date: entry.date,
            reference: entry.reference_number || 'JE-UNKNOWN',
            description: entry.description || '',
            lines: entryLines,
            isReversed: false,
            reversedEntryId: null,
            reversingForId: null,
            createdAt: entry.created_at,
            createdBy: entry.user_id || 'unknown'
          };
        });

        if (mappedEntries.length > 0) {
          setJournalEntries(mappedEntries);
        } else {
          setJournalEntries(INITIAL_JOURNAL_ENTRIES);
        }
      } catch (err) {
        console.error('Error fetching journal entries from Supabase:', err);
      }
    }
  };

  // Fetch accounts from Supabase table whenever session updates or reconnect succeeds
  const fetchAccountsFromSupabase = async () => {
    if (session?.mode === 'supabase' && supabase) {
      setAccountsLoading(true);
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('id', { ascending: true });

        if (error) {
          console.warn('accounts table query failed:', error.message);
          setAccountsSource('local');
          setAccounts(getLocalSandboxAccounts());
        } else if (data && data.length > 0) {
          setDbColumns(Object.keys(data[0]));
          const mappedAccounts = data.map(mapDbAccount);
          
          // Merge with any custom local storage accounts not yet in cloud to avoid losing freshly added accounts
          const localAccounts = getLocalSandboxAccounts();
          const mergedAccounts = [...mappedAccounts];
          localAccounts.forEach(acc => {
            if (!mergedAccounts.some(m => m.id === acc.id)) {
              mergedAccounts.push(acc);
            }
          });
          mergedAccounts.sort((a, b) => a.id.localeCompare(b.id));
          
          // Update local storage backup with the merged set
          localStorage.setItem('conexerp_sandbox_accounts', JSON.stringify(mergedAccounts));

          setAccounts(mergedAccounts);
          setAccountsSource('supabase');
          // Update journal entries using these newly populated accounts mapping records!
          await fetchJournalEntriesFromSupabase(mergedAccounts);
        } else {
          setAccountsSource('supabase-empty');
          const localAccounts = getLocalSandboxAccounts();
          setAccounts(localAccounts);
          await fetchJournalEntriesFromSupabase(localAccounts);
        }
      } catch (err) {
        console.warn('Network or schema fetch exception while loading accounts:', err);
        setAccountsSource('local');
        setAccounts(getLocalSandboxAccounts());
      } finally {
        setAccountsLoading(false);
      }
    } else {
      setAccounts(getLocalSandboxAccounts());
      setAccountsSource('local');
    }
  };

  useEffect(() => {
    if (session) {
      fetchAccountsFromSupabase();
    }
  }, [session]);

  // Seeding support utility to write CHART_OF_ACCOUNTS template direct to Supabase
  const handleSeedAccounts = async () => {
    if (session?.mode === 'supabase' && supabase) {
      setAccountsLoading(true);
      try {
        // Try standard camelCase schema insert first
        const { error } = await supabase
          .from('accounts')
          .insert(CHART_OF_ACCOUNTS);

        if (error) {
          console.warn('First seeding wave failed, trying snake_case schema:', error.message);
          const snakeChart = CHART_OF_ACCOUNTS.map(acc => ({
            id: acc.id,
            name: acc.name,
            class: acc.class,
            normal_balance: acc.normalBalance,
            description: acc.description
          }));
          const { error: error2 } = await supabase
            .from('accounts')
            .insert(snakeChart);

          if (error2) {
            console.warn('Second seeding wave failed, trying prefix/type schema:', error2.message);
            const prefixChart = CHART_OF_ACCOUNTS.map(acc => ({
              account_code: acc.id,
              account_name: acc.name,
              account_class: acc.class,
              normal_balance: acc.normalBalance,
              description: acc.description
            }));
            const { error: error3 } = await supabase
              .from('accounts')
              .insert(prefixChart);

            if (error3) {
              alert('Failed to seed accounts database: ' + error3.message);
              return;
            }
          }
        }

        await fetchAccountsFromSupabase();
        // Write seeding audit entry
        const seedLog: AuditLog = {
          id: `L-SEED-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'CREATE',
          actor: session?.user?.email || 'admin@conexerp.io',
          details: 'Successfully seeded CHART_OF_ACCOUNTS schema into Supabase accounts table.'
        };
        setAuditLogs(prev => [seedLog, ...prev]);
      } catch (err: any) {
        alert('Exception error while seeding accounts table: ' + err.message);
      } finally {
        setAccountsLoading(false);
      }
    }
  };

  // Handles adding custom account items with state updates
  const handleCreateAccount = async (newAccount: Account): Promise<boolean> => {
    let cloudSaved = false;
    let dbErrorMessage = '';

    if (session?.mode === 'supabase' && supabase) {
      let payload: any = {};
      
      if (dbColumns && dbColumns.length > 0) {
        dbColumns.forEach(col => {
          if (col === 'created_at' || col === 'updated_at') return;
          
          if (col === 'id') {
            const hasOtherCodeField = dbColumns.some(c => ['code', 'account_code', 'number', 'account_number', 'gl_code'].includes(c));
            if (hasOtherCodeField) {
              // Leave 'id' out to let Postgres default populate it with UUID if it generates it automatically
            } else {
              payload.id = newAccount.id;
            }
          } else if (['code', 'account_code', 'number', 'account_number', 'gl_code', 'acct_code'].includes(col)) {
            payload[col] = newAccount.id;
          } else if (['name', 'account_name', 'title', 'label'].includes(col)) {
            payload[col] = newAccount.name;
          } else if (['class', 'account_class', 'type', 'account_type', 'classification', 'category'].includes(col)) {
            payload[col] = newAccount.class;
          } else if (['normalBalance', 'normal_balance', 'normalbalance', 'balance_type', 'direction'].includes(col)) {
            payload[col] = newAccount.normalBalance;
          } else if (['description', 'account_description', 'desc', 'details', 'notes'].includes(col)) {
            payload[col] = newAccount.description;
          }
        });
      } else {
        payload = {
          account_code: newAccount.id,
          account_name: newAccount.name,
          account_type: newAccount.class,
          is_active: true
        };
      }

      console.log('Inserting custom account payload to Supabase:', payload);
      const { error } = await supabase
        .from('accounts')
        .insert(payload);

      if (error) {
        console.warn('Inserting designed payload failed, attempting direct standard inserts:', error.message);
        
        // Try fallback snake_case direct insert
        const snakePayload = {
          id: newAccount.id,
          name: newAccount.name,
          class: newAccount.class,
          normal_balance: newAccount.normalBalance,
          description: newAccount.description
        };
        const { error: errorS } = await supabase.from('accounts').insert(snakePayload);
        
        if (errorS) {
          // Try fallback database prefix direct insert
          const prefixPayload = {
            account_code: newAccount.id,
            account_name: newAccount.name,
            account_class: newAccount.class,
            normal_balance: newAccount.normalBalance,
            description: newAccount.description
          };
          const { error: errorP } = await supabase.from('accounts').insert(prefixPayload);
          
          if (errorP) {
            console.error('All inserts failed, details:', { error: error.message, errorS: errorS.message, errorP: errorP.message });
            dbErrorMessage = errorP.message || error.message;
          } else {
            cloudSaved = true;
          }
        } else {
          cloudSaved = true;
        }
      } else {
        cloudSaved = true;
      }
      
      if (cloudSaved) {
        // Let's re-fetch from the database to ensure we maintain exact synchronization
        await fetchAccountsFromSupabase();
      }
    }

    // Always fallback to memory state update so the app remains fully functional and robust in all conditions
    setAccounts(prev => {
      if (prev.some(a => a.id === newAccount.id)) return prev;
      const updated = [...prev, newAccount].sort((a, b) => a.id.localeCompare(b.id));
      localStorage.setItem('conexerp_sandbox_accounts', JSON.stringify(updated));
      return updated;
    });

    if (dbErrorMessage) {
      if (dbErrorMessage.includes('RLS') || dbErrorMessage.includes('row-level security') || dbErrorMessage.includes('policy')) {
        alert(
          `NOTICE: Account #${newAccount.id} ("${newAccount.name}") was saved locally in your active session, but could not be synced with Supabase because Row-Level Security (RLS) is enabled or write permissions are restricted on the 'accounts' table.\n\nTo save permanently in the cloud, add an RLS policy in your Supabase dashboard to permit INSERT queries.`
        );
      } else {
        alert(
          `NOTICE: Account #${newAccount.id} was saved locally for this session. (Cloud sync notice: ${dbErrorMessage})`
        );
      }
    }

    const createAccLog: AuditLog = {
      id: `L-ACCT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CREATE',
      actor: session?.user?.email || 'admin@conexerp.io',
      details: `Registered custom account category [${newAccount.id}] "${newAccount.name}" (Class: ${newAccount.class}, Normal: ${newAccount.normalBalance}).${dbErrorMessage ? ' (Warning: Local fallback used, db write restricted)' : ''}`
    };
    setAuditLogs(prev => {
      const updated = [createAccLog, ...prev];
      localStorage.setItem('conexerp_sandbox_audit_logs', JSON.stringify(updated));
      return updated;
    });

    // Write database triggers simulation audit log (and broadcast to all tabs!)
    writeLocalDbAuditLog('accounts', 'INSERT', newAccount.id, null, {
      id: newAccount.id,
      name: newAccount.name,
      class: newAccount.class,
      normal_balance: newAccount.normalBalance,
      description: newAccount.description
    });

    return true;
  };

  const handleLogout = async () => {
    const logoutLog: AuditLog = {
      id: `L-OUT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'AUTH_SIGN_OUT',
      actor: session?.user?.email || 'unknown',
      details: 'Auditor closed accounting portal session.'
    };

    setAuditLogs(prev => [logoutLog, ...prev]);
    await logout();
  };

  const handlePostJournalEntry = async (newEntry: JournalEntry) => {
    const customizedEntry = {
      ...newEntry,
      createdBy: session?.user?.email || 'sandbox-auditor@enterprise.io'
    };

    setJournalEntries(prev => {
      if (prev.some(e => e.id === customizedEntry.id)) return prev;
      const updated = [customizedEntry, ...prev];
      localStorage.setItem('conexerp_sandbox_journal_entries', JSON.stringify(updated));
      return updated;
    });

    const recordVal = customizedEntry.lines.reduce((s, c) => s + c.debit, 0) / 100;
    const postAudit: AuditLog = {
      id: `L-POST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CREATE',
      actor: customizedEntry.createdBy,
      details: `Posted double-entry journal reference: ${customizedEntry.reference}. Debit balance verification: $${recordVal.toFixed(2)}. Business purpose: "${customizedEntry.description}"`,
      targetId: customizedEntry.id
    };
    
    setAuditLogs(prev => {
      const updated = [postAudit, ...prev];
      localStorage.setItem('conexerp_sandbox_audit_logs', JSON.stringify(updated));
      return updated;
    });

    // Write database triggers simulation audit log (triggers broadcast automatically!)
    writeLocalDbAuditLog('journal_entries', 'INSERT', customizedEntry.id, null, {
      id: customizedEntry.id,
      date: customizedEntry.date,
      reference: customizedEntry.reference,
      description: customizedEntry.description,
      lines: customizedEntry.lines,
      created_by: customizedEntry.createdBy
    });

    if (session?.mode === 'supabase') {
      await fetchJournalEntriesFromSupabase();
    }
  };

  const handleReverseEntry = async (originalEntryId: string) => {
    const original = journalEntries.find(e => e.id === originalEntryId);
    if (!original || original.isReversed || original.reversingForId !== null) return;

    const reversingEntryId = `JE-REV-${Date.now().toString().slice(-4)}`;

    const reversedLines: JournalLine[] = original.lines.map(line => ({
      id: `line-rev-${Date.now()}-${Math.random()}`,
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit
    }));

    const reversingEntryDesc = `REVERSAL ENTRY for [${original.reference}] - original purpose: "${original.description}"`;
    const reversingReference = `REV-${original.reference}`;

    let finalReversingEntryId = reversingEntryId;

    if (session?.mode === 'supabase' && supabase) {
      try {
        const p_lines = reversedLines.map(line => {
          const matchedAcct = accounts.find(a => a.id === line.accountId);
          return {
            account_id: matchedAcct?.dbId || matchedAcct?.id || line.accountId,
            debit_amount: line.debit,
            credit_amount: line.credit
          };
        });

        const { data, error } = await supabase.rpc('create_balanced_journal_entry', {
          p_date: new Date().toISOString().split('T')[0],
          p_reference_number: reversingReference.toUpperCase(),
          p_description: reversingEntryDesc,
          p_lines: p_lines
        });

        if (error) {
          alert('Database error executing reversal transaction: ' + error.message);
          return;
        }

        if (data && typeof data === 'string') {
          finalReversingEntryId = data;
        }
      } catch (err: any) {
        alert('Network error executing reversal: ' + err.message);
        return;
      }
    }

    const reversingEntry: JournalEntry = {
      id: finalReversingEntryId,
      date: new Date().toISOString().split('T')[0],
      reference: reversingReference.toUpperCase(),
      description: reversingEntryDesc,
      lines: reversedLines,
      isReversed: false,
      reversedEntryId: null,
      reversingForId: originalEntryId,
      createdAt: new Date().toISOString(),
      createdBy: session?.user?.email || 'auditor@enterprise.io'
    };

    setJournalEntries(prev => {
      const updated = prev.map(entry => {
        if (entry.id === originalEntryId) {
          return {
            ...entry,
            isReversed: true,
            reversedEntryId: finalReversingEntryId
          };
        }
        return entry;
      }).concat(reversingEntry);
      localStorage.setItem('conexerp_sandbox_journal_entries', JSON.stringify(updated));
      return updated;
    });

    const reverseAudit: AuditLog = {
      id: `L-REV-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'REVERSE',
      actor: session?.user?.email || 'admin@enterprise.io',
      details: `Post-reversal audit action performed on ${originalEntryId}. Generated reversing voucher reference: ${reversingEntry.reference}`,
      targetId: originalEntryId
    };

    setAuditLogs(prev => {
      const updated = [reverseAudit, ...prev];
      localStorage.setItem('conexerp_sandbox_audit_logs', JSON.stringify(updated));
      return updated;
    });

    // Write database triggers simulation audit logs
    // 1. UPDATE trigger event for original journal entry being reversed
    const originalEntryOld = journalEntries.find(e => e.id === originalEntryId);
    writeLocalDbAuditLog('journal_entries', 'UPDATE', originalEntryId, originalEntryOld || null, {
      ...originalEntryOld,
      isReversed: true,
      reversedEntryId: finalReversingEntryId
    });

    // 2. INSERT trigger event for the newly posted reversing voucher
    writeLocalDbAuditLog('journal_entries', 'INSERT', finalReversingEntryId, null, reversingEntry);

    if (session?.mode === 'supabase') {
      await fetchJournalEntriesFromSupabase();
    }
  };

  // Sidebar navigation options list helper
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Chart of Accounts', icon: Coins },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'journal', label: 'Journal Entries', icon: FileSpreadsheet },
    { id: 'reports', label: 'Compliance Reports', icon: BarChart3 },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Connection Config', icon: Settings },
  ] as const;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-blue-500/20 selection:text-blue-300 antialiased">
      
      {/* MOBILE COMPACT NAVBAR SCREEN DESIGN */}
      <header className="flex md:hidden bg-[#121214] border-b border-zinc-805 px-4 h-16 items-center justify-between shrink-0 select-none z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs shadow-md">
            F
          </div>
          <span className="font-bold tracking-tight text-sm text-zinc-100">
            FINEX<span className="text-blue-500">ERP</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE DROPDOWN LINKS PANEL */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#121214] border-b border-zinc-805 px-4 py-3 space-y-1.5 animate-fade-in shrink-0 z-40 select-none">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-all text-left ${
                  activeTab === item.id 
                    ? 'bg-zinc-800 text-blue-400 font-semibold border-l-2 border-blue-550' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          {/* Mobile Profile & Logout */}
          <div className="pt-2 mt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="truncate max-w-[200px]">{session?.user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold"
            >
              <LogOut className="h-3 w-3" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP FIXED SIDEBAR NAVIGATION PANEL */}
      <aside className="hidden md:flex w-64 bg-[#121214] border-r border-zinc-800 flex-col justify-between shrink-0 select-none z-30 font-sans">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-850">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-900/40">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-zinc-100 text-[13px] uppercase">
                FINEX<span className="text-blue-500">ERP</span>
              </span>
              <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-mono font-bold leading-none mt-0.5">
                Secured Audit Core
              </span>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="p-4 space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs transition-all cursor-pointer group ${
                    activeTab === item.id 
                      ? 'bg-zinc-800 text-blue-400 font-semibold shadow-inner border-l-2 border-blue-500' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 ${activeTab === item.id ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'accounts' && accountsSource === 'supabase' && (
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-950/40 px-1 rounded">
                      DB
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Auditor Session Meta Desk Foot */}
        <div className="bg-[#09090b]/40 border-t border-zinc-850 p-4 font-sans space-y-3">
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-zinc-300">
              <UserCheck className="h-3.5 w-3.5 text-blue-450 shrink-0" />
              <span className="text-xs font-semibold truncate text-zinc-300 leading-none" title={session?.user?.email || 'Guest'}>
                {session?.user?.email}
              </span>
            </div>
            
            {session?.mode === 'supabase' ? (
              <span className="inline-flex items-center gap-1 w-fit mt-1 px-2 py-0.5 bg-emerald-550/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase rounded font-mono">
                <Globe className="w-2.5 h-2.5" /> Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 w-fit mt-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase rounded font-mono">
                <Database className="w-2.5 h-2.5" /> Sandbox Active
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-702 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded text-xs transition-colors cursor-pointer"
            id="desk-signout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out Auditor</span>
          </button>

        </div>
      </aside>

      {/* DETAILED CONTENT AREA WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in duration-200">
              <DashboardOverview 
                entries={journalEntries} 
                accounts={accounts} 
                auditLogs={auditLogs}
                onNavigate={(tab) => setActiveTab(tab)}
                isDbConnected={session?.mode === 'supabase'}
              />
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="animate-fade-in duration-200">
              <ChartOfAccounts 
                accounts={accounts}
                entries={journalEntries}
                isLoading={accountsLoading}
                source={accountsSource}
                onRefresh={fetchAccountsFromSupabase}
                onSeed={handleSeedAccounts}
                onCreateAccount={handleCreateAccount}
              />
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="animate-fade-in duration-200">
              <InvoicesView 
                accounts={accounts}
                onPostSuccess={handlePostJournalEntry}
                currentUserEmail={session?.user?.email || 'sandbox-auditor@enterprise.io'}
                onCreateAccount={handleCreateAccount}
              />
            </div>
          )}

          {activeTab === 'journal' && (
            <div className="animate-fade-in duration-200 space-y-8">
              
              {/* Form trigger section at top, with horizontal grid */}
              <div className="bg-[#121214] p-5 rounded border border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-850 pb-3">
                  <FileSpreadsheet className="h-4.5 w-4.5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">General Ledger Workspace</h3>
                    <p className="text-xs text-zinc-500">Post balanced double-entry statements securely</p>
                  </div>
                </div>

                <JournalEntryForm 
                  onPostSuccess={handlePostJournalEntry} 
                  currentUserEmail={session?.user?.email || 'sand@ledger.io'} 
                  accounts={accounts} // Dynamic dynamic list integration!
                />
              </div>

              {/* Transactions list */}
              <LedgerTable 
                entries={journalEntries} 
                onReverseEntry={handleReverseEntry} 
                auditLogs={auditLogs}
                accounts={accounts} // Dynamic accounts name lookup mapping!
              />

            </div>
          )}

          {activeTab === 'reports' && (
            <div className="animate-fade-in duration-200">
              <ComplianceReports 
                accounts={accounts} 
                entries={journalEntries} 
                session={session}
              />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="animate-fade-in duration-200">
              <AuditHistory />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-fade-in duration-200 max-w-2xl mx-auto">
              <ConnectivityStatus />
            </div>
          )}

        </main>

        {/* Continuous compliance validation footer */}
        <footer className="bg-[#121214] border-t border-zinc-850 py-3 text-center shrink-0 text-[9px] text-[#52525b] font-mono tracking-widest uppercase select-none flex items-center justify-center gap-1.5 select-none text-[10px]">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500/60" />
          <span>🔒 Sarbanes-Oxley cryptographic validation standard active | FINEX CORE BUILD v2.2</span>
        </footer>

      </div>

    </div>
    </ProtectedRoute>
  );
}
