/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { testSupabaseConnection, isSupabaseConfigured } from '../supabaseClient';
import { Settings, CheckCircle2, ChevronRight, XCircle, Info, Key, Server, Copy, Check } from 'lucide-react';

export default function ConnectivityStatus() {
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const performConnectionDiagnostics = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection();
    setTestResult(result);
    setTesting(false);
  };

  const copyConfigSnippet = () => {
    const snippet = `VITE_SUPABASE_URL="https://your-project-id.supabase.co"\nVITE_SUPABASE_ANON_KEY="your-anon-public-key"`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#121214] shadow-xl rounded border border-zinc-800 p-6 space-y-5" id="connectivity-status-guide">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
          <Settings className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Database Connection & Secrets Configuration</h3>
          <p className="text-xs text-zinc-500">Enable cloud storage of permanent double-entry financial statements</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Connection status card */}
        <div className="p-4 bg-[#09090b] rounded border border-zinc-805 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {isSupabaseConfigured ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-blue-400" />
              ) : (
                <XCircle className="h-4.5 w-4.5 text-amber-500 font-semibold" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-300">
                {isSupabaseConfigured ? 'Supabase Secure DB Connected' : 'Simulation Sandbox Mode (Local Mode)'}
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-sm mt-0.5">
                {isSupabaseConfigured 
                  ? 'All transaction vouchers and ledger entities are processed and locked in real Supabase server storage.'
                  : 'Operating inside an isolated, secure memory sandbox. Ledgers and security audit logs are kept locally to let you immediately preview changes.'
                }
              </p>
            </div>
          </div>

          <button
            onClick={performConnectionDiagnostics}
            disabled={testing}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-250 hover:text-white rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            {testing ? 'Testing Connection...' : 'Diagnostic Check'}
          </button>
        </div>

        {testResult && (
          <div className={`p-3.5 rounded border text-xs flex gap-2.5 items-start ${
            testResult.success 
              ? 'bg-blue-950/20 border-blue-800/40 text-blue-300' 
              : 'bg-amber-950/20 border-amber-800/40 text-amber-305'
          }`} id="diagnostic-result-banner">
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-400 shrink-0" />
            )}
            <div>
              <span className="font-bold block uppercase text-[10px] tracking-wider">{testResult.success ? 'Diagnostic Success' : 'Diagnostic Notice'}</span>
              <p className="mt-0.5 leading-relaxed font-sans">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Informational settings box */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 pt-2">
            <Key className="h-3.5 w-3.5 text-zinc-500" /> Connecting a Custom Supabase Database Instance
          </h4>
          
          <div className="text-xs leading-relaxed text-zinc-450 space-y-2">
            <p>
              To persist authentications and transactions securely in your cloud dashboard, locate your secrets in your <span className="text-zinc-200 font-semibold">Supabase → Settings → API</span> dashboard, then provide the variables in your workspace:
            </p>
            
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400 font-sans">
              <li>Open the <span className="text-zinc-200 font-semibold">Secrets / Environment Settings</span> in the AI Studio sidebar.</li>
              <li>Add the configuration parameters matching the environment keys below.</li>
              <li>Instantly compile and reload this workspace to process live accounting assets!</li>
            </ol>
          </div>

          {/* Copyable snippet tool */}
          <div className="bg-[#09090b] border border-zinc-800 p-4 rounded flex items-center justify-between gap-3">
            <div className="font-mono text-[10px] text-zinc-500 leading-relaxed truncate">
              <div>VITE_SUPABASE_URL="https://your-project-id.supabase.co"</div>
              <div className="mt-1">VITE_SUPABASE_ANON_KEY="your-anon-public-key"</div>
            </div>

            <button
              onClick={copyConfigSnippet}
              className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              title="Copy environment variable template to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-blue-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
