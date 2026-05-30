/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountClass = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export type NormalBalanceType = 'Debit' | 'Credit';

export interface Account {
  id: string; // Conventional Chart of Accounts numbering (e.g., "1010", "2010")
  name: string;
  class: AccountClass;
  normalBalance: NormalBalanceType;
  description: string;
  dbId?: string; // Database UUID if fetched from Supabase accounts table
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;  // Saved as integer in cents (e.g., $100.00 is saved as 10000)
  credit: number; // Saved as integer in cents (e.g., $100.00 is saved as 10000)
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  reference: string; // Ref/Check Number (e.g., "JE-1001", "CHK-402")
  description: string;
  lines: JournalLine[];
  isReversed: boolean;
  reversedEntryId: string | null;  // Pointer to the entry that reversed this item
  reversingForId: string | null;   // If this IS a reversing entry, point to the original one
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'REVERSE' | 'SOFT_DELETE' | 'AUTH_SIGN_IN' | 'AUTH_SIGN_UP' | 'AUTH_SIGN_OUT';
  actor: string;
  details: string;
  targetId?: string;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
  } | null;
  mode: 'supabase' | 'sandbox';
  supabaseConfigured: boolean;
}

export function mapDbAccount(row: any): Account {
  if (!row) {
    return {
      id: '',
      name: '',
      class: 'Asset',
      normalBalance: 'Debit',
      description: ''
    };
  }

  // 1. Determine ID (Account Code, e.g. "1010")
  // Check common database column names for account code
  const codeKeys = ['code', 'account_code', 'number', 'account_number', 'gl_code', 'gl_id', 'acct_code', 'account_id'];
  let code = '';
  for (const key of codeKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      code = String(row[key]);
      break;
    }
  }

  // If we couldn't find a dedicated code field, use the id field itself.
  let idVal = row.id !== undefined && row.id !== null ? String(row.id) : '';
  const isUuid = idVal.includes('-') && idVal.length > 20;
  
  const finalId = (isUuid && code) ? code : (code || idVal);

  // 2. Determine Account Name
  const nameKeys = ['name', 'account_name', 'title', 'label', 'account_title'];
  let name = '';
  for (const key of nameKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      name = String(row[key]);
      break;
    }
  }
  if (!name && row.description && row.description.length < 50) {
    name = row.description;
  }
  if (!name) {
    name = 'Unnamed Account';
  }

  // 3. Determine Account Class / Type
  const classKeys = ['class', 'account_class', 'type', 'account_type', 'classification', 'category'];
  let rawClass = '';
  for (const key of classKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      rawClass = String(row[key]);
      break;
    }
  }
  
  let finalClass: AccountClass = 'Asset';
  if (rawClass) {
    const lower = rawClass.toLowerCase();
    if (lower.includes('asset')) finalClass = 'Asset';
    else if (lower.includes('liab')) finalClass = 'Liability';
    else if (lower.includes('equ')) finalClass = 'Equity';
    else if (lower.includes('rev') || lower.includes('inc') || lower.includes('sales')) finalClass = 'Revenue';
    else if (lower.includes('exp') || lower.includes('cost')) finalClass = 'Expense';
  }

  // 4. Determine Normal Balance Type
  const balanceKeys = ['normalBalance', 'normal_balance', 'normalbalance', 'balance_type', 'direction', 'balance_direction'];
  let rawBalance = '';
  for (const key of balanceKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      rawBalance = String(row[key]);
      break;
    }
  }

  let finalBalance: NormalBalanceType = (finalClass === 'Asset' || finalClass === 'Expense') ? 'Debit' : 'Credit';
  if (rawBalance) {
    const lower = rawBalance.toLowerCase();
    if (lower.startsWith('deb')) finalBalance = 'Debit';
    else if (lower.startsWith('cre')) finalBalance = 'Credit';
  }

  // 5. Determine Description
  const descKeys = ['description', 'account_description', 'desc', 'details', 'notes', 'purpose'];
  let description = '';
  for (const key of descKeys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      if (String(row[key]) !== name) {
        description = String(row[key]);
        break;
      }
    }
  }

  return {
    id: finalId,
    name,
    class: finalClass,
    normalBalance: finalBalance,
    description: description || `${name} account description.`,
    dbId: row.id
  };
}
