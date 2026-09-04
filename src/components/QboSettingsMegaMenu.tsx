/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { 
  PlayCircle, 
  HelpCircle, 
  X, 
  Building2, 
  Users, 
  FileSpreadsheet, 
  Sliders, 
  BookOpen, 
  DollarSign, 
  Info,
  List, 
  Package, 
  Repeat, 
  Paperclip, 
  Tag, 
  CheckSquare,
  RefreshCw, 
  Printer, 
  UploadCloud, 
  Download, 
  Scale, 
  PieChart, 
  ShieldAlert, 
  Monitor, 
  LifeBuoy,
  CreditCard, 
  Sparkles, 
  MessageSquare, 
  Lock, 
  Shuffle
} from 'lucide-react';
import { useCompany } from '../CompanyContext';

export type QboMenuKey = 
  | 'account-settings'
  | 'manage-users'
  | 'custom-form-styles'
  | 'default-report-settings'
  | 'chart-of-accounts'
  | 'payroll-settings'
  | 'additional-info'
  | 'all-lists'
  | 'products-services'
  | 'recurring-transactions'
  | 'attachments'
  | 'custom-fields'
  | 'rules'
  | 'reclassify-transactions'
  | 'order-cheques'
  | 'import-data'
  | 'import-outside-data'
  | 'export-data'
  | 'reconcile'
  | 'budgeting'
  | 'audit-log'
  | 'share-screen'
  | 'resolution-centre'
  | 'subscriptions-billing'
  | 'whats-new'
  | 'feedback'
  | 'privacy'
  | 'switch-company';

interface QboSettingsMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (key: QboMenuKey) => void;
  onOpenTutorials: () => void;
}

export default function QboSettingsMegaMenu({
  isOpen,
  onClose,
  onSelectAction,
  onOpenTutorials
}: QboSettingsMegaMenuProps) {
  const { viewMode, toggleViewMode, activeCompany } = useCompany();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (key: QboMenuKey) => {
    onClose();
    onSelectAction(key);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-16 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        ref={menuRef}
        id="qbo-gear-mega-menu"
        className="relative w-full max-w-5xl bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Top Header with Close Button */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              System Settings & Tools • {activeCompany?.name || 'Company'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
            title="Close menu (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Columns Menu Grid (matching the screenshot exactly) */}
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* COLUMN 1: YOUR COMPANY */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              YOUR COMPANY
            </h3>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>
                <button
                  onClick={() => handleAction('account-settings')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Account and settings
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('manage-users')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Manage users
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('custom-form-styles')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Custom form styles
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('default-report-settings')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Default report settings
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('chart-of-accounts')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Chart of accounts
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('payroll-settings')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Payroll settings
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('additional-info')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer flex items-center gap-1.5"
                >
                  <span>Additional info</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 2: LISTS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              LISTS
            </h3>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>
                <button
                  onClick={() => handleAction('all-lists')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  All lists
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('products-services')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Products and services
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('recurring-transactions')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Recurring transactions
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('attachments')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Attachments
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('custom-fields')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Custom fields
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('rules')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Rules
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: TOOLS */}
          <div className="space-y-4 border-l border-slate-100 lg:pl-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              TOOLS
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <li>
                <button
                  onClick={() => handleAction('reclassify-transactions')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Reclassify transactions
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('order-cheques')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Order cheques
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('import-data')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Import data
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('import-outside-data')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Import outside data
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('export-data')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Export data
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('reconcile')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer font-medium text-blue-900"
                >
                  Reconcile
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('budgeting')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer font-medium text-blue-900"
                >
                  Budgeting
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('audit-log')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Audit log
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('share-screen')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Share screen
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('resolution-centre')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13px] cursor-pointer"
                >
                  Resolution centre
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: PROFILE */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              PROFILE
            </h3>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>
                <button
                  onClick={() => handleAction('subscriptions-billing')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Subscriptions and billing
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('whats-new')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  What's new
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('feedback')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Feedback
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('privacy')}
                  className="w-full text-left hover:text-blue-600 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer"
                >
                  Privacy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleAction('switch-company')}
                  className="w-full text-left text-blue-600 font-bold hover:text-blue-800 hover:translate-x-0.5 transition-all text-[13.5px] cursor-pointer flex items-center justify-between"
                >
                  <span>Switch company</span>
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Footer Bar matching the screenshot */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 text-xs">
          
          {/* Left: Video tutorials */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTutorials();
            }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors mb-2 sm:mb-0"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="underline">Video tutorials</span>
          </button>

          {/* Right: Switch from Accountant view to Business view */}
          <button
            type="button"
            onClick={toggleViewMode}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors"
            title="Toggle between detailed double-entry debit/credit ledger and simplified business invoice view"
          >
            <span>
              {viewMode === 'accountant' 
                ? 'Switch from Accountant view to Business view' 
                : 'Switch from Business view to Accountant view'}
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </button>

        </div>
      </div>
    </div>
  );
}
