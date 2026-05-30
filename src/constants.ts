/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, JournalEntry } from './types';

export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets
  {
    id: '1010',
    name: 'Cash & Cash Equivalents',
    class: 'Asset',
    normalBalance: 'Debit',
    description: 'Operating bank accounts, petty cash, and liquid reserves.'
  },
  {
    id: '1020',
    name: 'Accounts Receivable',
    class: 'Asset',
    normalBalance: 'Debit',
    description: 'Uncollected bills and invoices outstanding from corporate clients.'
  },
  {
    id: '1200',
    name: 'Accounts Receivable',
    class: 'Asset',
    normalBalance: 'Debit',
    description: 'Billed client receivables and company invoices outstanding.'
  },
  {
    id: '1500',
    name: 'Equipment & Machinery',
    class: 'Asset',
    normalBalance: 'Debit',
    description: 'Hardware, office computing units, and permanent capital furniture.'
  },
  
  // Liabilities
  {
    id: '2010',
    name: 'Accounts Payable',
    class: 'Liability',
    normalBalance: 'Credit',
    description: 'Unpaid bills, vendor invoices, and short-term obligations.'
  },
  {
    id: '2020',
    name: 'Accrued Wages & Salaries',
    class: 'Liability',
    normalBalance: 'Credit',
    description: 'Earned employee compensation not yet dispersed in payroll.'
  },
  {
    id: '2200',
    name: 'Sales Tax Payable',
    class: 'Liability',
    normalBalance: 'Credit',
    description: 'Sales taxes collected and owed to taxing authorities.'
  },

  // Equity
  {
    id: '3010',
    name: 'Common Stock',
    class: 'Equity',
    normalBalance: 'Credit',
    description: 'Initial paid-in capital from shareholders and founding partners.'
  },
  {
    id: '3020',
    name: 'Retained Earnings',
    class: 'Equity',
    normalBalance: 'Credit',
    description: 'Accumulated net profit invested back into the company.'
  },

  // Revenue
  {
    id: '4000',
    name: 'Sales Revenue',
    class: 'Revenue',
    normalBalance: 'Credit',
    description: 'Operational revenue earned from customer invoices.'
  },
  {
    id: '4010',
    name: 'Professional Services Revenue',
    class: 'Revenue',
    normalBalance: 'Credit',
    description: 'Income recognized from consulting, engineering, and support services.'
  },
  {
    id: '4020',
    name: 'Software Licensing Income',
    class: 'Revenue',
    normalBalance: 'Credit',
    description: 'Recurring monthly or annual software subscriptions and platform access.'
  },

  // Expenses
  {
    id: '5010',
    name: 'Office Rent & Utilities',
    class: 'Expense',
    normalBalance: 'Debit',
    description: 'Corporate headquarters rent, electricity, and connectivity services.'
  },
  {
    id: '5020',
    name: 'Wages & Salaries Expense',
    class: 'Expense',
    normalBalance: 'Debit',
    description: 'Active employee compensation, payroll taxes, and staff benefits.'
  },
  {
    id: '5030',
    name: 'Marketing & Advertising',
    class: 'Expense',
    normalBalance: 'Debit',
    description: 'Lead generation expenditures, search spend, and branding tools.'
  }
];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'JE-001',
    date: '2026-05-01',
    reference: 'SEC-101',
    description: 'Initial company capitalization by founders',
    lines: [
      { id: 'L-001a', accountId: '1010', debit: 5000000, credit: 0 }, // $50,000.00
      { id: 'L-001b', accountId: '3010', debit: 0, credit: 5000000 }  // $50,000.00
    ],
    isReversed: false,
    reversedEntryId: null,
    reversingForId: null,
    createdAt: '2026-05-01T09:00:00Z',
    createdBy: 'founder@enterprise.io'
  },
  {
    id: 'JE-002',
    date: '2026-05-05',
    reference: 'RENT-501',
    description: 'Prepaid rent for office headquarters',
    lines: [
      { id: 'L-002a', accountId: '5010', debit: 350000, credit: 0 },  // $3,500.00
      { id: 'L-002b', accountId: '1010', debit: 0, credit: 350000 }   // $3,500.00
    ],
    isReversed: false,
    reversedEntryId: null,
    reversingForId: null,
    createdAt: '2026-05-05T10:30:00Z',
    createdBy: 'founder@enterprise.io'
  },
  {
    id: 'JE-003',
    date: '2026-05-15',
    reference: 'INV-1025',
    description: 'Billed client for enterprise software licensing onboarding',
    lines: [
      { id: 'L-003a', accountId: '1020', debit: 1250000, credit: 0 }, // $12,500.00
      { id: 'L-003b', accountId: '4020', debit: 0, credit: 1250000 }  // $12,500.00
    ],
    isReversed: false,
    reversedEntryId: null,
    reversingForId: null,
    createdAt: '2026-05-15T14:15:00Z',
    createdBy: 'founder@enterprise.io'
  },
  {
    id: 'JE-004',
    date: '2026-05-20',
    reference: 'PAY-112',
    description: 'Acquired server computers and testing machinery on credit',
    lines: [
      { id: 'L-004a', accountId: '1200', debit: 620000, credit: 0 },  // $6,200.00
      { id: 'L-004b', accountId: '2010', debit: 0, credit: 620000 }   // $6,200.00
    ],
    isReversed: false,
    reversedEntryId: null,
    reversingForId: null,
    createdAt: '2026-05-20T11:00:00Z',
    createdBy: 'founder@enterprise.io'
  }
];
