/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, PlayCircle, BookOpen, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface VideoTutorialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialTopic {
  id: string;
  title: string;
  duration: string;
  category: string;
  description: string;
  highlights: string[];
}

const TUTORIALS: TutorialTopic[] = [
  {
    id: 'tut-1',
    title: 'Multi-Company Architecture & Company Switching',
    duration: '4:15',
    category: 'Core Setup',
    description: 'Learn how to create independent company legal entities, set up distinct tax IDs, and switch between company ledgers in one click.',
    highlights: ['Multi-entity isolation', 'Currency & fiscal year definition', 'One-click company switcher']
  },
  {
    id: 'tut-2',
    title: 'Closing the Books & Financial Period Locks',
    duration: '5:30',
    category: 'Accounting Controls',
    description: 'Ensure audit integrity by locking historical periods with closing dates and supervisory passwords to prevent unauthorized backdated entries.',
    highlights: ['Closing date configuration', 'Closing password protection', 'GAAP compliance assurance']
  },
  {
    id: 'tut-3',
    title: 'Bank & General Ledger Reconciliation',
    duration: '6:45',
    category: 'Bookkeeping',
    description: 'Step-by-step workflow to clear deposits and payments against bank statements until the variance reaches $0.00.',
    highlights: ['Statement ending balance entry', 'Clearing ledger lines', 'Zero-difference balancing']
  },
  {
    id: 'tut-4',
    title: 'Double-Entry Journal Vouchers & Audit Trail',
    duration: '3:50',
    category: 'Ledger Operations',
    description: 'How to post balanced debit-credit vouchers, perform GAAP-compliant reversing entries, and inspect real-time audit logs.',
    highlights: ['Debit equals Credit validation', 'Immutability & soft-reversals', 'Audit log inspection']
  },
  {
    id: 'tut-5',
    title: 'Managing Team Access & User Roles',
    duration: '3:20',
    category: 'Administration',
    description: 'Assign roles (Admin, Accountant, Standard, Read-Only) to protect company books and delegate billing workflows securely.',
    highlights: ['User role permissions', 'Invitations & status tracking', 'Revoking access']
  }
];

export default function VideoTutorialsModal({ isOpen, onClose }: VideoTutorialsModalProps) {
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialTopic>(TUTORIALS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <PlayCircle className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold">FinexERP Enterprise Video Academy</h3>
              <p className="text-[11px] text-slate-400">Step-by-step training for controllers, accountants, and founders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Tutorial List */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto shrink-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
              Modules ({TUTORIALS.length})
            </div>
            <div className="space-y-1">
              {TUTORIALS.map((tut) => {
                const isSel = tut.id === selectedTutorial.id;
                return (
                  <button
                    key={tut.id}
                    onClick={() => {
                      setSelectedTutorial(tut);
                      setIsPlaying(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSel ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isSel ? 'text-blue-200' : 'text-slate-500'}`}>
                        {tut.category}
                      </span>
                      <span className={`font-mono text-[10px] ${isSel ? 'text-blue-100' : 'text-slate-500'}`}>
                        {tut.duration}
                      </span>
                    </div>
                    <div className="font-semibold line-clamp-2">{tut.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tutorial Player & Info */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-white">
            {/* Mock Player Screen */}
            <div className="relative aspect-video w-full rounded-xl bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
              {isPlaying ? (
                <div className="p-6 text-center text-white space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mx-auto"></div>
                  <p className="text-sm font-semibold">Streaming High-Definition Interactive Tutorial...</p>
                  <p className="text-xs text-slate-400">"{selectedTutorial.title}"</p>
                  <button
                    onClick={() => setIsPlaying(false)}
                    className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Pause Video
                  </button>
                </div>
              ) : (
                <div className="text-center p-6 text-white space-y-3">
                  <div 
                    onClick={() => setIsPlaying(true)}
                    className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center mx-auto cursor-pointer shadow-lg transform hover:scale-105 transition-all"
                  >
                    <PlayCircle className="w-9 h-9" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">{selectedTutorial.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">Duration: {selectedTutorial.duration} • Category: {selectedTutorial.category}</p>
                  </div>
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Watch Tutorial Now
                  </button>
                </div>
              )}
            </div>

            {/* Tutorial Overview */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Module Overview</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedTutorial.description}
              </p>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Key Takeaways</h5>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {selectedTutorial.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
