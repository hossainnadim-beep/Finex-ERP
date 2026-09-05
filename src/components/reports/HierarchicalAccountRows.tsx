/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Account } from '../../types';
import { formatGAAPCurrency } from './reportUtils';

export interface ReportAccountItem {
  account: Account;
  balance: number;
}

interface HierarchicalAccountRowsProps {
  items: ReportAccountItem[];
  currencySymbol: string;
  onDrillDown?: (accountId?: string) => void;
  emptyMessage?: string;
}

export default function HierarchicalAccountRows({
  items,
  currencySymbol,
  onDrillDown,
  emptyMessage = 'No accounts recorded'
}: HierarchicalAccountRowsProps) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-slate-500 italic py-2">{emptyMessage}</p>;
  }

  // Find all mother accounts and organize sub-accounts under them
  const itemMap = new Map<string, ReportAccountItem>();
  items.forEach(i => itemMap.set(i.account.id, i));

  // Direct children map by parentId
  const childrenMap = new Map<string, ReportAccountItem[]>();
  const topLevelItems: ReportAccountItem[] = [];

  items.forEach(item => {
    if (item.account.isSubAccount && item.account.parentId) {
      const list = childrenMap.get(item.account.parentId) || [];
      list.push(item);
      childrenMap.set(item.account.parentId, list);
    } else {
      topLevelItems.push(item);
    }
  });

  // Also catch any sub-accounts whose parent account is not present in topLevelItems
  const processedSubIds = new Set<string>();
  topLevelItems.forEach(parent => {
    const subs = childrenMap.get(parent.account.id) || [];
    subs.forEach(s => processedSubIds.add(s.account.id));
  });

  const orphanSubs = items.filter(
    i => i.account.isSubAccount && i.account.parentId && !processedSubIds.has(i.account.id)
  );

  return (
    <div className="divide-y divide-slate-200">
      {topLevelItems.map(parentItem => {
        const { account: parentAcc, balance: parentDirectBal } = parentItem;
        const subItems = childrenMap.get(parentAcc.id) || [];
        const hasSubAccounts = subItems.length > 0;

        if (!hasSubAccounts) {
          // Standard single account line (no sub-accounts)
          return (
            <div
              key={parentAcc.id}
              className="flex justify-between items-center py-2 text-xs hover:bg-slate-50 px-1 transition-colors"
            >
              <div>
                <button
                  onClick={() => onDrillDown?.(parentAcc.id)}
                  className="text-slate-900 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
                  title={`Click to view transaction breakdown for ${parentAcc.name}`}
                >
                  {parentAcc.name}
                </button>
                <span className="text-[10px] text-slate-500 font-mono ml-2">#{parentAcc.id}</span>
              </div>
              <button
                onClick={() => onDrillDown?.(parentAcc.id)}
                className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                title={`Click to drill down into transaction report for ${parentAcc.name}`}
              >
                {formatGAAPCurrency(parentDirectBal, currencySymbol)}
              </button>
            </div>
          );
        }

        // Mother Account with Sub-Accounts
        const subTotal = subItems.reduce((sum, s) => sum + s.balance, 0);
        const groupTotal = parentDirectBal + subTotal;

        return (
          <div key={parentAcc.id} className="py-2 space-y-1">
            {/* Mother Account Main Header Line */}
            <div className="flex justify-between items-center px-1 text-xs font-semibold text-slate-900 hover:bg-slate-50 py-1 rounded transition-colors">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onDrillDown?.(parentAcc.id)}
                  className="text-slate-900 font-bold hover:text-blue-600 hover:underline cursor-pointer text-left"
                  title={`Click to view transactions for mother account ${parentAcc.name}`}
                >
                  {parentAcc.name}
                </button>
                <span className="text-[10px] text-slate-500 font-mono">#{parentAcc.id}</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-normal bg-slate-100 text-slate-600 border border-slate-300">
                  Mother Account ({subItems.length} sub-account{subItems.length > 1 ? 's' : ''})
                </span>
              </div>

              {/* If mother account has direct balance and sub accounts, show parent direct balance here */}
              {parentDirectBal !== 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 mr-2 font-normal">Direct:</span>
                  <button
                    onClick={() => onDrillDown?.(parentAcc.id)}
                    className="font-mono text-slate-800 hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    {formatGAAPCurrency(parentDirectBal, currencySymbol)}
                  </button>
                </div>
              )}
            </div>

            {/* Indented Sub-Accounts */}
            <div className="space-y-0.5 ml-3 pl-3 border-l-2 border-blue-300/60 my-1">
              {subItems.map(subItem => {
                const { account: subAcc, balance: subBal } = subItem;
                return (
                  <div
                    key={subAcc.id}
                    className="flex justify-between items-center py-1.5 text-xs hover:bg-blue-50/50 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-mono text-sm leading-none">↳</span>
                      <button
                        onClick={() => onDrillDown?.(subAcc.id)}
                        className="text-slate-800 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
                        title={`Click to view transaction breakdown for sub-account ${subAcc.name}`}
                      >
                        {subAcc.name}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">#{subAcc.id}</span>
                    </div>

                    <button
                      onClick={() => onDrillDown?.(subAcc.id)}
                      className="font-mono text-slate-800 font-medium hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                      title={`Drill down into #${subAcc.id}`}
                    >
                      {formatGAAPCurrency(subBal, currencySymbol)}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Group Summary / Total Line for the Mother Account */}
            <div className="flex justify-between items-center px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-50 rounded border-t border-slate-200">
              <span className="text-slate-700 italic">Total {parentAcc.name}</span>
              <button
                onClick={() => onDrillDown?.(parentAcc.id)}
                className="font-mono text-slate-900 font-bold hover:text-blue-600 hover:underline cursor-pointer"
                title={`Total for ${parentAcc.name} group`}
              >
                {formatGAAPCurrency(groupTotal, currencySymbol)}
              </button>
            </div>
          </div>
        );
      })}

      {/* Render any orphan sub-accounts */}
      {orphanSubs.map(orphan => (
        <div
          key={orphan.account.id}
          className="flex justify-between items-center py-1.5 pl-4 pr-1 text-xs hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-mono text-sm leading-none">↳</span>
            <div>
              <button
                onClick={() => onDrillDown?.(orphan.account.id)}
                className="text-slate-900 font-medium hover:text-blue-600 hover:underline cursor-pointer text-left"
              >
                {orphan.account.name}
              </button>
              <span className="text-[10px] text-slate-500 font-mono ml-2">#{orphan.account.id}</span>
              <span className="text-[10px] text-slate-400 font-mono ml-2">(Sub of #{orphan.account.parentId})</span>
            </div>
          </div>
          <button
            onClick={() => onDrillDown?.(orphan.account.id)}
            className="font-mono text-slate-900 font-semibold hover:text-blue-600 hover:underline cursor-pointer"
          >
            {formatGAAPCurrency(orphan.balance, currencySymbol)}
          </button>
        </div>
      ))}
    </div>
  );
}
