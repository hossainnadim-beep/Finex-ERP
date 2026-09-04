/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, JournalEntry } from '../../types';

export type ReportPeriodPreset = 
  | 'this_month'
  | 'this_quarter'
  | 'this_year_ytd'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'all_time'
  | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Calculates start and end dates based on a preset.
 */
export function getPresetDateRange(preset: ReportPeriodPreset): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'this_month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'this_quarter': {
      const qStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qStartMonth, 1);
      const end = new Date(year, qStartMonth + 3, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'this_year_ytd': {
      const start = new Date(year, 0, 1);
      const end = now;
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'last_quarter': {
      const qStartMonth = (Math.floor(month / 3) - 1) * 3;
      const start = new Date(year, qStartMonth, 1);
      const end = new Date(year, qStartMonth + 3, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'last_year': {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case 'all_time':
    default: {
      return { startDate: '2020-01-01', endDate: formatDate(now) };
    }
  }
}

/**
 * Format currency with proper symbol and negative handling in GAAP format:
 * Standard GAAP format for negatives is parentheses: ($1,234.56)
 */
export function formatGAAPCurrency(cents: number, symbol: string = '$', useParentheses: boolean = true): string {
  const isNegative = cents < 0;
  const absAmount = Math.abs(cents) / 100;
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(absAmount);

  if (isNegative) {
    return useParentheses ? `(${symbol}${formattedNumber})` : `-${symbol}${formattedNumber}`;
  }
  return `${symbol}${formattedNumber}`;
}

/**
 * Format a human-readable date for accounting standards
 * e.g., "September 4, 2026"
 */
export function formatAccountingDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Filter journal entries by date range
 */
export function filterEntriesByDateRange(
  entries: JournalEntry[], 
  startDate?: string, 
  endDate?: string
): JournalEntry[] {
  return entries.filter(entry => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });
}

export interface AccountCalculatedBalances {
  debits: number;   // Total debits in cents
  credits: number;  // Total credits in cents
  netDebit: number; // debits - credits
  final: number;    // Balance aligned with account's normal balance
}

/**
 * Calculates balance for all accounts based on journal entries
 */
export function computeAccountBalances(
  accounts: Account[],
  entries: JournalEntry[]
): Record<string, AccountCalculatedBalances> {
  const balances: Record<string, AccountCalculatedBalances> = {};

  accounts.forEach(acc => {
    balances[acc.id] = { debits: 0, credits: 0, netDebit: 0, final: 0 };
  });

  entries.forEach(entry => {
    entry.lines.forEach(line => {
      if (!balances[line.accountId]) {
        balances[line.accountId] = { debits: 0, credits: 0, netDebit: 0, final: 0 };
      }
      balances[line.accountId].debits += line.debit;
      balances[line.accountId].credits += line.credit;
    });
  });

  accounts.forEach(acc => {
    const b = balances[acc.id] || { debits: 0, credits: 0, netDebit: 0, final: 0 };
    b.netDebit = b.debits - b.credits;
    if (acc.normalBalance === 'Debit') {
      b.final = b.debits - b.credits;
    } else {
      b.final = b.credits - b.debits;
    }
  });

  return balances;
}

/**
 * Formats YYYY-MM-DD into DD/MM/YYYY
 */
export function formatDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

/**
 * Converts DD/MM/YYYY into YYYY-MM-DD
 */
export function parseDDMMYYYYToISO(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Infers transaction type from reference, accounts, and description
 */
export function inferTransactionType(entry: JournalEntry, currentAccountId?: string, accounts?: Account[]): string {
  const ref = (entry.reference || '').toUpperCase();
  const desc = (entry.description || '').toLowerCase();

  if (ref.startsWith('CHK') || ref.startsWith('CHQ') || desc.includes('cheque') || desc.includes('check') || desc.includes('bill payment')) {
    return 'Bill Payment (Cheque)';
  }
  if (ref.startsWith('BILL') || desc.includes('vendor bill')) {
    return 'Bill';
  }
  if (ref.startsWith('INV') || desc.includes('invoice') || desc.includes('client billing')) {
    return 'Invoice';
  }
  if (desc.includes('sales receipt') || desc.includes('customer payment')) {
    return 'Sales Receipt';
  }
  if (desc.includes('payroll') || desc.includes('wages') || desc.includes('salary')) {
    return 'Payroll';
  }
  if (desc.includes('deposit') || desc.includes('capitalization') || desc.includes('capital contribution')) {
    return 'Deposit';
  }
  if (desc.includes('transfer') || desc.includes('wire')) {
    return 'Transfer';
  }
  if (ref.startsWith('EXP') || desc.includes('expense') || desc.includes('subscription') || desc.includes('purchase')) {
    return 'Expense';
  }

  // Check accounts involved
  if (accounts && entry.lines) {
    const hasExpense = entry.lines.some(l => {
      const acc = accounts.find(a => a.id === l.accountId);
      return acc?.class === 'Expense';
    });
    if (hasExpense) return 'Expense';
  }

  return 'Journal Entry';
}

/**
 * Infers Payee / Customer / Vendor name from description or counterparty
 */
export function inferPayeeName(entry: JournalEntry, fallbackSplit?: string): string {
  const desc = entry.description || '';

  // Common pattern checks: e.g. "Payment to [Name]", "Bill payment - [Name]", "from [Name]"
  const toMatch = desc.match(/(?:payment to|paid to|bill to|fee to|vendor)\s+([A-Za-z0-9&.\s'-]+?)(?:\s*[-–(,]|\s+for|\s*$)/i);
  if (toMatch && toMatch[1].trim().length > 1) {
    return toMatch[1].trim();
  }

  const fromMatch = desc.match(/(?:from|by|client)\s+([A-Za-z0-9&.\s'-]+?)(?:\s*[-–(,]|\s+for|\s*$)/i);
  if (fromMatch && fromMatch[1].trim().length > 1) {
    return fromMatch[1].trim();
  }

  // Dash separated entity at the end e.g. "Prepaid rent - Cushman & Wakefield"
  if (desc.includes(' - ')) {
    const parts = desc.split(' - ');
    const last = parts[parts.length - 1].trim();
    if (last.length > 1 && !last.toLowerCase().includes('inv-') && !last.toLowerCase().includes('je-')) {
      return last;
    }
  }

  // Well known vendors / software
  const lower = desc.toLowerCase();
  if (lower.includes('adobe')) return 'Adobe';
  if (lower.includes('amazon')) return 'Amazon Prime';
  if (lower.includes('bourbonniere')) return 'Mitch Bourbonniere';
  if (lower.includes('dylan pate') || lower.includes('pate')) return 'Dylan Pate';
  if (lower.includes('google')) return 'Google Workspace';
  if (lower.includes('aws') || lower.includes('amazon web services')) return 'Amazon Web Services';
  if (lower.includes('microsoft')) return 'Microsoft 365';
  if (lower.includes('slack')) return 'Slack Technologies';
  if (lower.includes('cushman')) return 'Cushman & Wakefield';
  if (lower.includes('acme')) return 'Acme Corp';
  if (lower.includes('founder') || lower.includes('capitalization')) return 'Founding Partner';
  if (lower.includes('dell')) return 'Dell Technologies';
  if (lower.includes('consulting')) return 'Client Partner';
  if (lower.includes('rent')) return 'Office Landlord';

  if (fallbackSplit && fallbackSplit !== '-SPLIT-') {
    return fallbackSplit;
  }

  return 'Entity / Payee';
}

/**
 * Determines the offset counter-account for this line in a journal entry.
 * Standard accounting practice (QuickBooks / NetSuite):
 * If only 1 other account exists, show that account.
 * If multiple other accounts exist, show '-SPLIT-'.
 */
export function getSplitAccountName(entry: JournalEntry, currentAccountId: string, accounts: Account[]): string {
  const otherLines = entry.lines.filter(l => l.accountId !== currentAccountId);
  if (otherLines.length === 0) {
    return '—';
  }

  const distinctAccountIds = Array.from(new Set(otherLines.map(l => l.accountId)));
  if (distinctAccountIds.length === 1) {
    const otherAcc = accounts.find(a => a.id === distinctAccountIds[0]);
    if (otherAcc) {
      return `${otherAcc.id} ${otherAcc.name}`;
    }
    return `#${distinctAccountIds[0]}`;
  }

  return '-SPLIT-';
}

/**
 * Format signed currency with clean negative notation matching QuickBooks ($ -29.11)
 */
export function formatSignedGAAPCurrency(cents: number, symbol: string = '$'): string {
  const isNegative = cents < 0;
  const absDollars = (Math.abs(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (isNegative) {
    return `${symbol} -${absDollars}`;
  }
  return `${symbol} ${absDollars}`;
}

