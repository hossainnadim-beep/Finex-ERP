/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  CompanySettings, 
  CompanyUser, 
  UserRole, 
  ViewMode, 
  Account, 
  JournalEntry, 
  AuditLog, 
  IssuedInvoice,
  ProductOrService,
  RecurringTransaction,
  ReconciliationRecord,
  BudgetRecord
} from './types';
import { CHART_OF_ACCOUNTS, INITIAL_JOURNAL_ENTRIES } from './constants';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  companies: CompanySettings[];
  activeCompany: CompanySettings | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  updateCompany: (id: string, updates: Partial<CompanySettings>) => void;
  createCompany: (companyData: Omit<CompanySettings, 'id' | 'createdAt' | 'updatedAt'>) => CompanySettings;
  deleteCompany: (id: string) => void;
  
  // Users for current company
  companyUsers: CompanyUser[];
  addCompanyUser: (user: Omit<CompanyUser, 'id' | 'joinedAt'>) => void;
  updateCompanyUserRole: (id: string, role: UserRole) => void;
  removeCompanyUser: (id: string) => void;

  // View Mode: 'accountant' (GL codes, debits/credits) vs 'business' (Simplified)
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;

  // Accounting Rules Helpers
  isPeriodClosed: (dateStr: string) => boolean;
  verifyClosingPassword: (password: string) => boolean;

  // Products & Services for active company
  products: ProductOrService[];
  addProduct: (product: Omit<ProductOrService, 'id' | 'companyId'>) => void;
  updateProduct: (id: string, updates: Partial<ProductOrService>) => void;
  deleteProduct: (id: string) => void;

  // Recurring transactions
  recurringTransactions: RecurringTransaction[];
  addRecurringTransaction: (tx: Omit<RecurringTransaction, 'id' | 'companyId'>) => void;
  toggleRecurringTransaction: (id: string) => void;

  // Reconciliations
  reconciliations: ReconciliationRecord[];
  addReconciliation: (rec: Omit<ReconciliationRecord, 'id' | 'companyId' | 'reconciledAt'>) => void;

  // Budgets
  budgets: BudgetRecord[];
  saveBudget: (budget: Omit<BudgetRecord, 'id' | 'companyId'>) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const DEFAULT_COMPANY_TEMPLATE: Omit<CompanySettings, 'id' | 'ownerUserId' | 'createdAt' | 'updatedAt'> = {
  name: 'Finex Global Enterprises',
  legalName: 'Finex Global Enterprises Inc.',
  taxId: '12-3456789',
  industry: 'Technology & Cloud Solutions',
  companyType: 'Corporation',
  email: 'corporate@finexerp.com',
  phone: '+1 (800) 555-0199',
  website: 'https://finexerp.com',
  currency: 'USD',
  currencySymbol: '$',
  address: {
    street: '100 Enterprise Way, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    country: 'United States'
  },
  legalAddress: {
    street: '100 Enterprise Way, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    country: 'United States'
  },
  customerFacingAddress: {
    street: '100 Enterprise Way, Suite 400',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    country: 'United States'
  },
  fiscalYearStartMonth: 1, // January
  taxYearStartMonth: 1, // January
  accountingMethod: 'Accrual',
  closeBooks: false,
  closingDate: null,
  closingPassword: '',
  defaultInvoiceTerms: 'Net 30',
  defaultSalesMessage: 'Thank you for your partnership and business!'
};

const DEFAULT_PRODUCTS: Omit<ProductOrService, 'id' | 'companyId'>[] = [
  {
    name: 'Corporate Financial Consulting',
    sku: 'SRV-CONS-01',
    type: 'Service',
    description: 'Enterprise ERP implementation guidance, custom reporting advisory, and configuration service.',
    priceCents: 15000,
    incomeAccountId: '4010',
    expenseAccountId: '5010'
  },
  {
    name: 'SOX Compliance Audit Preparation',
    sku: 'SRV-AUDIT-02',
    type: 'Service',
    description: 'Comprehensive audit readiness analysis and controls mapping verification.',
    priceCents: 250000,
    incomeAccountId: '4010',
    expenseAccountId: '5010'
  },
  {
    name: 'Controller Advisory Support',
    sku: 'SRV-ADVISORY-03',
    type: 'Service',
    description: 'Active ledger monitoring, bookkeeping assurance, and monthly closing assessment.',
    priceCents: 85000,
    incomeAccountId: '4010',
    expenseAccountId: '5010'
  },
  {
    name: 'Software Platform License',
    sku: 'LIC-SFT-04',
    type: 'Service',
    description: 'Recurring enterprise ledger and financial management software platform seat.',
    priceCents: 49900,
    incomeAccountId: '4020',
    expenseAccountId: '5010'
  }
];

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user?.id || 'guest';
  const userEmail = session?.user?.email || 'admin@company.com';

  const [companies, setCompanies] = useState<CompanySettings[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('accountant');
  const [products, setProducts] = useState<ProductOrService[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);

  // Load companies for the current user session
  useEffect(() => {
    if (!session) {
      setCompanies([]);
      setActiveCompanyId(null);
      return;
    }

    const storageKey = `finex_companies_${userId}`;
    let loadedCompanies: CompanySettings[] = [];
    
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        loadedCompanies = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading stored companies:', e);
    }

    // If user has no companies yet, check if registration passed a pending company, or create the default company
    if (!loadedCompanies || loadedCompanies.length === 0) {
      // Check for registration pending company
      let pendingCompany: Partial<CompanySettings> | null = null;
      try {
        const pendingRaw = localStorage.getItem(`finex_pending_registration_company_${userEmail}`);
        if (pendingRaw) {
          pendingCompany = JSON.parse(pendingRaw);
          localStorage.removeItem(`finex_pending_registration_company_${userEmail}`);
        }
      } catch (_) {}

      const initialCompanyId = `cmp_${Date.now()}`;
      const newCompany: CompanySettings = {
        ...DEFAULT_COMPANY_TEMPLATE,
        ...(pendingCompany || {}),
        id: initialCompanyId,
        ownerUserId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      loadedCompanies = [newCompany];
      localStorage.setItem(storageKey, JSON.stringify(loadedCompanies));

      // Migrate legacy sandbox data if available
      try {
        const legacyAccounts = localStorage.getItem(`conexerp_sandbox_accounts_${userId}`);
        if (legacyAccounts) {
          const parsed = JSON.parse(legacyAccounts);
          const tagged = parsed.map((a: Account) => ({ ...a, companyId: initialCompanyId }));
          localStorage.setItem(`finex_company_${initialCompanyId}_accounts`, JSON.stringify(tagged));
        } else {
          // Initialize default Chart of Accounts for this company
          const defaultAccounts = CHART_OF_ACCOUNTS.map(a => ({ ...a, companyId: initialCompanyId }));
          localStorage.setItem(`finex_company_${initialCompanyId}_accounts`, JSON.stringify(defaultAccounts));
        }

        const legacyJE = localStorage.getItem(`conexerp_sandbox_journal_entries_${userId}`);
        if (legacyJE) {
          const parsedJE = JSON.parse(legacyJE);
          const taggedJE = parsedJE.map((je: JournalEntry) => ({ ...je, companyId: initialCompanyId }));
          localStorage.setItem(`finex_company_${initialCompanyId}_journal_entries`, JSON.stringify(taggedJE));
        } else {
          const initialJE = INITIAL_JOURNAL_ENTRIES.map(je => ({ ...je, companyId: initialCompanyId }));
          localStorage.setItem(`finex_company_${initialCompanyId}_journal_entries`, JSON.stringify(initialJE));
        }
      } catch (err) {
        console.warn('Migration note:', err);
      }

      // Initialize default users for this company
      const initialUsers: CompanyUser[] = [
        {
          id: `usr_${Date.now()}_1`,
          companyId: initialCompanyId,
          userId: userId,
          name: userEmail.split('@')[0],
          email: userEmail,
          role: 'Admin',
          status: 'Active',
          joinedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(`finex_company_${initialCompanyId}_users`, JSON.stringify(initialUsers));

      // Initialize default products for this company
      const initialProducts: ProductOrService[] = DEFAULT_PRODUCTS.map((p, idx) => ({
        ...p,
        id: `prod_${Date.now()}_${idx}`,
        companyId: initialCompanyId
      }));
      localStorage.setItem(`finex_company_${initialCompanyId}_products`, JSON.stringify(initialProducts));
    }

    setCompanies(loadedCompanies);

    // Set active company ID from saved preference or first company
    const savedActiveId = localStorage.getItem(`finex_active_company_${userId}`);
    if (savedActiveId && loadedCompanies.some(c => c.id === savedActiveId)) {
      setActiveCompanyId(savedActiveId);
    } else {
      const firstId = loadedCompanies[0].id;
      setActiveCompanyId(firstId);
      localStorage.setItem(`finex_active_company_${userId}`, firstId);
    }
  }, [session, userId, userEmail]);

  // Active company derived object
  const activeCompany = companies.find(c => c.id === activeCompanyId) || (companies.length > 0 ? companies[0] : null);

  // Load sub-resources whenever active company changes
  useEffect(() => {
    if (!activeCompany) {
      setCompanyUsers([]);
      setProducts([]);
      setRecurringTransactions([]);
      setReconciliations([]);
      setBudgets([]);
      return;
    }

    const cmpId = activeCompany.id;

    // Load company users
    try {
      const rawUsers = localStorage.getItem(`finex_company_${cmpId}_users`);
      if (rawUsers) {
        setCompanyUsers(JSON.parse(rawUsers));
      } else {
        const defaultUsers: CompanyUser[] = [
          {
            id: `usr_${cmpId}_owner`,
            companyId: cmpId,
            userId: userId,
            name: userEmail.split('@')[0],
            email: userEmail,
            role: 'Admin',
            status: 'Active',
            joinedAt: activeCompany.createdAt
          }
        ];
        setCompanyUsers(defaultUsers);
        localStorage.setItem(`finex_company_${cmpId}_users`, JSON.stringify(defaultUsers));
      }
    } catch (_) {}

    // Load products
    try {
      const rawProd = localStorage.getItem(`finex_company_${cmpId}_products`);
      if (rawProd) {
        setProducts(JSON.parse(rawProd));
      } else {
        const initProd = DEFAULT_PRODUCTS.map((p, i) => ({
          ...p,
          id: `prod_${cmpId}_${i}`,
          companyId: cmpId
        }));
        setProducts(initProd);
        localStorage.setItem(`finex_company_${cmpId}_products`, JSON.stringify(initProd));
      }
    } catch (_) {}

    // Load recurring transactions
    try {
      const rawRec = localStorage.getItem(`finex_company_${cmpId}_recurring`);
      if (rawRec) {
        setRecurringTransactions(JSON.parse(rawRec));
      } else {
        // Seed a sample recurring transaction
        const sampleRec: RecurringTransaction[] = [
          {
            id: `rec_${cmpId}_1`,
            companyId: cmpId,
            templateName: 'Monthly Cloud Infrastructure & Server Hosting',
            type: 'JournalEntry',
            frequency: 'Monthly',
            nextDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            amountCents: 45000,
            description: 'Monthly accrued server, hosting and SaaS infrastructure costs.',
            status: 'Active'
          }
        ];
        setRecurringTransactions(sampleRec);
        localStorage.setItem(`finex_company_${cmpId}_recurring`, JSON.stringify(sampleRec));
      }
    } catch (_) {}

    // Load reconciliations
    try {
      const rawRecon = localStorage.getItem(`finex_company_${cmpId}_reconcile`);
      if (rawRecon) {
        setReconciliations(JSON.parse(rawRecon));
      } else {
        setReconciliations([]);
      }
    } catch (_) {}

    // Load budgets
    try {
      const rawBud = localStorage.getItem(`finex_company_${cmpId}_budgets`);
      if (rawBud) {
        setBudgets(JSON.parse(rawBud));
      } else {
        setBudgets([]);
      }
    } catch (_) {}

    // Load viewMode preference
    try {
      const savedView = localStorage.getItem(`finex_view_mode_${cmpId}`);
      if (savedView === 'accountant' || savedView === 'business') {
        setViewMode(savedView);
      }
    } catch (_) {}

  }, [activeCompany, userId, userEmail]);

  // Set active company and persist choice
  const handleSetActiveCompanyId = useCallback((id: string) => {
    setActiveCompanyId(id);
    if (session) {
      localStorage.setItem(`finex_active_company_${userId}`, id);
    }
  }, [session, userId]);

  // Update existing company settings
  const updateCompany = useCallback((id: string, updates: Partial<CompanySettings>) => {
    setCompanies(prev => {
      const updated = prev.map(comp => {
        if (comp.id === id) {
          return {
            ...comp,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return comp;
      });
      if (session) {
        localStorage.setItem(`finex_companies_${userId}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [session, userId]);

  // Create brand new company with full isolated accounting environment
  const createCompany = useCallback((companyData: Omit<CompanySettings, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `cmp_${Date.now()}`;
    const newComp: CompanySettings = {
      ...companyData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Initialize Chart of Accounts for new company
    const newAccounts: Account[] = CHART_OF_ACCOUNTS.map(a => ({
      ...a,
      companyId: newId
    }));
    localStorage.setItem(`finex_company_${newId}_accounts`, JSON.stringify(newAccounts));

    // Initialize opening journal entry for new company
    const newOpeningJE: JournalEntry = {
      id: `je-${newId}-opening`,
      companyId: newId,
      date: new Date().toISOString().split('T')[0],
      reference: 'JE-OPENING-01',
      description: `Opening Capital Contribution & Ledger Seeding for ${newComp.name}`,
      lines: [
        { id: `line-${newId}-1`, accountId: '1010', debit: 5000000, credit: 0 },
        { id: `line-${newId}-2`, accountId: '3010', debit: 0, credit: 5000000 }
      ],
      isReversed: false,
      reversedEntryId: null,
      reversingForId: null,
      createdAt: new Date().toISOString(),
      createdBy: userEmail
    };
    localStorage.setItem(`finex_company_${newId}_journal_entries`, JSON.stringify([newOpeningJE]));

    // Initialize company users (creator as Admin)
    const newUsers: CompanyUser[] = [
      {
        id: `usr_${newId}_owner`,
        companyId: newId,
        userId: userId,
        name: userEmail.split('@')[0],
        email: userEmail,
        role: 'Admin',
        status: 'Active',
        joinedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(`finex_company_${newId}_users`, JSON.stringify(newUsers));

    // Initialize default products
    const newProducts: ProductOrService[] = DEFAULT_PRODUCTS.map((p, idx) => ({
      ...p,
      id: `prod_${newId}_${idx}`,
      companyId: newId
    }));
    localStorage.setItem(`finex_company_${newId}_products`, JSON.stringify(newProducts));

    // Append to companies list and set as active
    setCompanies(prev => {
      const updated = [...prev, newComp];
      if (session) {
        localStorage.setItem(`finex_companies_${userId}`, JSON.stringify(updated));
      }
      return updated;
    });

    handleSetActiveCompanyId(newId);
    return newComp;
  }, [session, userId, userEmail, handleSetActiveCompanyId]);

  // Delete company (cannot delete if it's the only one)
  const deleteCompany = useCallback((id: string) => {
    if (companies.length <= 1) {
      alert('Cannot delete the only remaining company. Every account must have at least one active company.');
      return;
    }
    const remaining = companies.filter(c => c.id !== id);
    setCompanies(remaining);
    if (session) {
      localStorage.setItem(`finex_companies_${userId}`, JSON.stringify(remaining));
    }
    if (activeCompanyId === id && remaining.length > 0) {
      handleSetActiveCompanyId(remaining[0].id);
    }
  }, [companies, activeCompanyId, session, userId, handleSetActiveCompanyId]);

  // Company user management
  const addCompanyUser = useCallback((userPayload: Omit<CompanyUser, 'id' | 'joinedAt'>) => {
    if (!activeCompany) return;
    const newUser: CompanyUser = {
      ...userPayload,
      id: `usr_${Date.now()}`,
      joinedAt: new Date().toISOString()
    };
    setCompanyUsers(prev => {
      const updated = [...prev, newUser];
      localStorage.setItem(`finex_company_${activeCompany.id}_users`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  const updateCompanyUserRole = useCallback((id: string, role: UserRole) => {
    if (!activeCompany) return;
    setCompanyUsers(prev => {
      const updated = prev.map(u => u.id === id ? { ...u, role } : u);
      localStorage.setItem(`finex_company_${activeCompany.id}_users`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  const removeCompanyUser = useCallback((id: string) => {
    if (!activeCompany) return;
    setCompanyUsers(prev => {
      const updated = prev.filter(u => u.id !== id);
      localStorage.setItem(`finex_company_${activeCompany.id}_users`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  // View Mode toggle
  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (activeCompany) {
      localStorage.setItem(`finex_view_mode_${activeCompany.id}`, mode);
    }
  }, [activeCompany]);

  const toggleViewMode = useCallback(() => {
    const nextMode = viewMode === 'accountant' ? 'business' : 'accountant';
    handleSetViewMode(nextMode);
  }, [viewMode, handleSetViewMode]);

  // Accounting Rules: Close Books verification
  const isPeriodClosed = useCallback((dateStr: string): boolean => {
    if (!activeCompany || !activeCompany.closeBooks || !activeCompany.closingDate) {
      return false;
    }
    const entryDate = new Date(dateStr);
    const closingDate = new Date(activeCompany.closingDate);
    return entryDate <= closingDate;
  }, [activeCompany]);

  const verifyClosingPassword = useCallback((password: string): boolean => {
    if (!activeCompany || !activeCompany.closingPassword) {
      return true; // No password required if not set
    }
    return activeCompany.closingPassword === password;
  }, [activeCompany]);

  // Products
  const addProduct = useCallback((product: Omit<ProductOrService, 'id' | 'companyId'>) => {
    if (!activeCompany) return;
    const newP: ProductOrService = {
      ...product,
      id: `prod_${Date.now()}`,
      companyId: activeCompany.id
    };
    setProducts(prev => {
      const updated = [...prev, newP];
      localStorage.setItem(`finex_company_${activeCompany.id}_products`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  const updateProduct = useCallback((id: string, updates: Partial<ProductOrService>) => {
    if (!activeCompany) return;
    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem(`finex_company_${activeCompany.id}_products`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  const deleteProduct = useCallback((id: string) => {
    if (!activeCompany) return;
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(`finex_company_${activeCompany.id}_products`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  // Recurring transactions
  const addRecurringTransaction = useCallback((tx: Omit<RecurringTransaction, 'id' | 'companyId'>) => {
    if (!activeCompany) return;
    const newTx: RecurringTransaction = {
      ...tx,
      id: `rec_${Date.now()}`,
      companyId: activeCompany.id
    };
    setRecurringTransactions(prev => {
      const updated = [...prev, newTx];
      localStorage.setItem(`finex_company_${activeCompany.id}_recurring`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  const toggleRecurringTransaction = useCallback((id: string) => {
    if (!activeCompany) return;
    setRecurringTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          return { ...t, status: t.status === 'Active' ? 'Paused' : 'Active' } as RecurringTransaction;
        }
        return t;
      });
      localStorage.setItem(`finex_company_${activeCompany.id}_recurring`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  // Reconciliations
  const addReconciliation = useCallback((rec: Omit<ReconciliationRecord, 'id' | 'companyId' | 'reconciledAt'>) => {
    if (!activeCompany) return;
    const newRec: ReconciliationRecord = {
      ...rec,
      id: `recon_${Date.now()}`,
      companyId: activeCompany.id,
      reconciledAt: new Date().toISOString()
    };
    setReconciliations(prev => {
      const updated = [newRec, ...prev];
      localStorage.setItem(`finex_company_${activeCompany.id}_reconcile`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  // Budgets
  const saveBudget = useCallback((budget: Omit<BudgetRecord, 'id' | 'companyId'>) => {
    if (!activeCompany) return;
    const newBud: BudgetRecord = {
      ...budget,
      id: `bud_${budget.fiscalYear}_${budget.accountId}`,
      companyId: activeCompany.id
    };
    setBudgets(prev => {
      const filtered = prev.filter(b => !(b.fiscalYear === budget.fiscalYear && b.accountId === budget.accountId));
      const updated = [...filtered, newBud];
      localStorage.setItem(`finex_company_${activeCompany.id}_budgets`, JSON.stringify(updated));
      return updated;
    });
  }, [activeCompany]);

  return (
    <CompanyContext.Provider value={{
      companies,
      activeCompany,
      activeCompanyId,
      setActiveCompanyId: handleSetActiveCompanyId,
      updateCompany,
      createCompany,
      deleteCompany,
      companyUsers,
      addCompanyUser,
      updateCompanyUserRole,
      removeCompanyUser,
      viewMode,
      setViewMode: handleSetViewMode,
      toggleViewMode,
      isPeriodClosed,
      verifyClosingPassword,
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      recurringTransactions,
      addRecurringTransaction,
      toggleRecurringTransaction,
      reconciliations,
      addReconciliation,
      budgets,
      saveBudget
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
