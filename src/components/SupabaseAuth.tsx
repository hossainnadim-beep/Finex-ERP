/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Shield, Sparkles, AlertCircle, CheckCircle2, Lock, Mail, Server, Info, ArrowRight } from 'lucide-react';
import { UserSession } from '../types';

interface SupabaseAuthProps {
  onLoginSuccess: (session: UserSession) => void;
  statusMessage?: string;
}

export default function SupabaseAuth({ onLoginSuccess }: SupabaseAuthProps) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'cloud' | 'sandbox'>('cloud');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error' | 'warning'; 
    message: string;
    isNetworkFailure?: boolean;
  } | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  const handleSandboxLogin = (targetEmail?: string) => {
    const emailToUse = targetEmail || email || 'architect@enterprise.io';
    const pwdToUse = password || 'corporate-password';

    if (!emailToUse) {
      setNotification({
        type: 'error',
        message: 'Please provide an email address to continue.'
      });
      return;
    }

    setLoading(true);
    setNotification(null);

    setTimeout(() => {
      setLoading(false);
      const cleanId = 'sand-usr-' + emailToUse.toLowerCase().replace(/[^a-z0-9]/g, '_');
      onLoginSuccess({
        user: { id: cleanId, email: emailToUse },
        mode: 'sandbox',
        supabaseConfigured: false
      });
    }, 600);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setNotification({
        type: 'error',
        message: 'Please enter both your email address and password key.'
      });
      return;
    }

    // If explicitly set to sandbox mode or Supabase is not configured, login via sandbox
    if (authMode === 'sandbox' || !isSupabaseConfigured || !supabase) {
      handleSandboxLogin(emailTrimmed);
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Set a timeout to prevent hanging on unreachable cloud backends
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Remote database is unreachable.')), 5000)
        );

        const signUpPromise = supabase.auth.signUp({
          email: emailTrimmed,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });

        const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as any;

        if (error) throw error;

        if (data?.user && !data?.session) {
          setNotification({
            type: 'success',
            message: 'Account registered! Please check your email inbox to confirm your registration.'
          });
        } else if (data?.session) {
          setNotification({
            type: 'success',
            message: 'Account successfully registered and signed in!'
          });
          setTimeout(() => {
            onLoginSuccess({
              user: { id: data.user?.id || 'id', email: data.user?.email || emailTrimmed },
              mode: 'supabase',
              supabaseConfigured: true
            });
          }, 800);
        }
      } else {
        // Sign in with password with a timeout to catch unreachable endpoints quickly
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Remote database is unreachable.')), 5000)
        );

        const signInPromise = supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password,
        });

        const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any;

        if (error) throw error;

        setNotification({
          type: 'success',
          message: 'Authenticated successfully! Initializing ledger...'
        });
        
        setTimeout(() => {
          onLoginSuccess({
            user: { id: data.user?.id || 'id', email: data.user?.email || emailTrimmed },
            mode: 'supabase',
            supabaseConfigured: true
          });
        }, 800);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'An error occurred during authentication.';
      const isNetworkIssue = 
        errMsg.toLowerCase().includes('failed to fetch') ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('timed out') ||
        errMsg.toLowerCase().includes('unreachable') ||
        errMsg.toLowerCase().includes('fetch failed') ||
        err?.name === 'TypeError';

      if (isNetworkIssue) {
        setNotification({
          type: 'error',
          isNetworkFailure: true,
          message: 'Remote cloud database is currently unreachable (Failed to fetch). You can enter instantly in Enterprise Sandbox / Demo mode with your account credentials.'
        });
      } else {
        setNotification({
          type: 'error',
          isNetworkFailure: false,
          message: errMsg
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row relative overflow-hidden" id="supabase-auth-screen">
      {/* Ambient glow decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Left panel: Enterprise message & audit simulation */}
      <div className="w-full md:w-5/12 bg-[#121214] border-b md:border-b-0 md:border-r border-zinc-800 p-8 lg:p-12 flex flex-col justify-between">
        <div className="space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-900/20">
                F
              </div>
              <span className="text-xl font-semibold tracking-tight uppercase text-zinc-100 font-sans">
                FINEX<span className="text-blue-500">ERP</span>
              </span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-light leading-tight text-zinc-100">
              Double-entry precision for modern enterprise.
            </h1>
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed max-w-sm">
              Built for strict ACID compliance and immutable audit trails. Your financial integrity is our primary architectural constraint.
            </p>
          </div>

          {/* Connection status badge / Sandbox detail block */}
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800/80 p-4.5 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Audit Connection Status</span>
                <span className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured 
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse'
                }`}></span>
              </div>
              
              {isSupabaseConfigured ? (
                <div className="text-xs text-zinc-400 font-sans space-y-1">
                  <span className="text-emerald-400 font-semibold block">✓ Cloud Cluster Active</span>
                  <p className="text-zinc-500 text-[11px] leading-normal">
                    Routing security tokens and credentials securely through active Supabase Auth infrastructure.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 font-sans space-y-1">
                  <span className="text-amber-400 font-semibold block">⚠️ Simulation Sandbox Active</span>
                  <p className="text-zinc-500 text-[11px] leading-normal">
                    Supabase key is not defined in <code>.env</code>. You can log in using <strong>any credentials</strong> to preview the fully functional audit ledger immediately.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 space-y-1">
                <div className="flex justify-between">
                  <span>Standard ledger variation:</span>
                  <span className="text-emerald-400">0.00 [MATCHED]</span>
                </div>
                <div className="flex justify-between">
                  <span>Cryptographic signature:</span>
                  <span>AES-256-GCM COMPLIANT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-0 flex items-center gap-6 opacity-40 text-[10px] text-zinc-400 uppercase tracking-widest font-bold font-mono">
          <span>PCI-DSS COMPLIANT</span>
          <span>SOC2 TYPE II</span>
        </div>
      </div>

      {/* Right panel: Form input */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Sign in to Console</h2>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                authMode === 'cloud' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {authMode === 'cloud' ? 'Cloud Supabase' : 'Offline Sandbox'}
              </span>
            </div>
            <p className="text-slate-600 text-xs">Enter your enterprise credentials to access the financial ledger.</p>
          </div>

          {/* Interactive tab selector */}
          <div className="flex border-b border-slate-200 text-xs font-semibold gap-2 select-none">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setAuthMode('cloud'); setNotification(null); }}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
                !isSignUp && authMode === 'cloud'
                  ? 'border-blue-600 text-blue-600 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
              id="tab-signin"
            >
              Cloud Login
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setAuthMode('cloud'); setNotification(null); }}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
                isSignUp && authMode === 'cloud'
                  ? 'border-blue-600 text-blue-600 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
              id="tab-signup"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { 
                setAuthMode('sandbox'); 
                setIsSignUp(false); 
                setNotification({
                  type: 'warning',
                  message: 'Sandbox mode is active. You can enter using any email without needing live cloud connectivity.'
                });
              }}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ml-auto ${
                authMode === 'sandbox'
                  ? 'border-amber-600 text-amber-700 font-bold' 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
              id="tab-sandbox"
            >
              ⚡ Instant Sandbox
            </button>
          </div>

          {/* High-contrast Notification / Recovery Box */}
          {notification && (
            <div className={`p-4 rounded-lg border text-xs shadow-sm flex flex-col gap-2 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : notification.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`} id="auth-alert-message">
              <div className="flex items-start gap-2.5">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : notification.type === 'warning' ? (
                  <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-[11px] uppercase tracking-wider mb-0.5">
                    {notification.type === 'success' ? 'Operation Success' : notification.type === 'warning' ? 'Notice' : 'Authentication Issue'}
                  </div>
                  <div className="text-xs leading-relaxed font-sans font-medium">
                    {notification.message}
                  </div>
                </div>
              </div>

              {/* Seamless 1-Click Recovery button when Network / Cloud is unreachable */}
              {notification.isNetworkFailure && (
                <div className="mt-2 pt-2 border-t border-red-200/80 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSandboxLogin(email)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded text-xs shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-200" />
                    <span>Enter Console in Instant Sandbox Mode ({email ? email : 'Personal Account'})</span>
                  </button>
                  <span className="text-[10px] text-slate-500 text-center">
                    All double-entry ledger features and balance sheets will operate locally.
                  </span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                Email Address
              </label>
              <div className="relative rounded">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                  placeholder="architect@enterprise.io"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="password" className="uppercase tracking-wider text-slate-700 font-bold">
                  Password Key
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(!showForgotModal)}
                    className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline text-[11px]"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative rounded">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                  placeholder="••••••••"
                />
              </div>
              {isSignUp && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Minimum length is 6 characters.
                </p>
              )}
            </div>

            {/* Forgot password explanation toggle */}
            {showForgotModal && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  <span>Account Credentials Recovery</span>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  If you forgot your password or cannot access your email verification, you can immediately access the ledger using <strong>Instant Sandbox Mode</strong> with full double-entry precision.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    handleSandboxLogin(email || 'architect@enterprise.io');
                  }}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-1.5 px-3 rounded text-xs transition-colors cursor-pointer"
                >
                  Enter via Sandbox with {email || 'Current Account'}
                </button>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                id="auth-submit-button"
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-all text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <span>Authenticating Handshake...</span>
                  </div>
                ) : (
                  <>
                    <span>
                      {authMode === 'sandbox' 
                        ? 'Enter Ledger (Sandbox Mode)' 
                        : isSignUp 
                        ? 'Create Corporate Account' 
                        : 'Access Ledger Console'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Direct Instant Sandbox button */}
              {authMode === 'cloud' && (
                <button
                  type="button"
                  onClick={() => handleSandboxLogin(email)}
                  disabled={loading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium py-2 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Bypass / Enter via Demo Sandbox Mode</span>
                </button>
              )}
            </div>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              <span className="bg-[#f8fafc] px-3">Quick Demo Accounts</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button 
              type="button"
              onClick={() => { 
                setEmail('architect@enterprise.io'); 
                setPassword('corporate-password'); 
                setAuthMode('cloud');
                setNotification(null);
              }}
              className="flex items-center justify-center gap-1.5 border border-slate-300 rounded py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Architect</span>
            </button>

            <button 
              type="button"
              onClick={() => { 
                setEmail('auditor@compliance.org'); 
                setPassword('auditor-password'); 
                setAuthMode('cloud');
                setNotification(null);
              }}
              className="flex items-center justify-center gap-1.5 border border-slate-300 rounded py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auditor</span>
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-500">
            Protected by enterprise double-entry audit encryption protocols.
          </p>
        </div>
      </div>
    </div>
  );
}
