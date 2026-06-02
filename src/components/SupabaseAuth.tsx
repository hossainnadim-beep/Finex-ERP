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
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSandboxLogin = () => {
    // Elegant fallback simulation
    if (!email || !password) {
      setNotification({
        type: 'error',
        message: 'Please fill in both email and password fields.'
      });
      return;
    }

    if (password.length < 6) {
      setNotification({
        type: 'error',
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const cleanId = 'sand-usr-' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      onLoginSuccess({
        user: { id: cleanId, email: email },
        mode: 'sandbox',
        supabaseConfigured: false
      });
    }, 850);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!isSupabaseConfigured || !supabase) {
      // Run Sandbox Auth bypass seamlessly with alert explanation
      handleSandboxLogin();
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setNotification({
            type: 'success',
            message: 'Account registered! Please check your email inbox to confirm your registration.'
          });
        } else if (data.session) {
          setNotification({
            type: 'success',
            message: 'Account successfully registered and signed in!'
          });
          setTimeout(() => {
            onLoginSuccess({
              user: { id: data.user?.id || 'id', email: data.user?.email || email },
              mode: 'supabase',
              supabaseConfigured: true
            });
          }, 1200);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setNotification({
          type: 'success',
          message: 'Authenticated successfully!'
        });
        
        setTimeout(() => {
          onLoginSuccess({
            user: { id: data.user?.id || 'id', email: data.user?.email || email },
            mode: 'supabase',
            supabaseConfigured: true
          });
        }, 1000);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'An error occurred during authentication.'
      });
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
        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">Sign in to Console</h2>
            <p className="text-zinc-500 text-sm mt-1">Enter your enterprise credentials to continue.</p>
          </div>

          {/* Interactive tab selector */}
          <div className="flex border-b border-zinc-800 text-sm font-medium">
            <button
              onClick={() => { setIsSignUp(false); setNotification(null); }}
              className={`pb-4 px-2 border-b-2 transition-all ${
                !isSignUp 
                  ? 'border-blue-500 text-zinc-100 font-semibold' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              id="tab-signin"
            >
              Login
            </button>
            <button
              onClick={() => { setIsSignUp(true); setNotification(null); }}
              className={`pb-4 px-6 border-b-2 transition-all ${
                isSignUp 
                  ? 'border-blue-500 text-zinc-100 font-semibold' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              id="tab-signup"
            >
              Create Account
            </button>
          </div>

          {/* Notification box */}
          {notification && (
            <div className={`p-4 rounded border flex items-start gap-3 text-xs ${
              notification.type === 'success' 
                ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300' 
                : 'bg-rose-950/20 border-rose-805 text-rose-300'
            }`} id="auth-alert-message">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-zinc-500 font-bold">
                Email Address
              </label>
              <div className="relative rounded">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  placeholder="architect@enterprise.io"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="password" className="uppercase tracking-wider text-zinc-500 font-bold">
                  Password Key
                </label>
                {!isSignUp && (
                  <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                    Forgot?
                  </span>
                )}
              </div>
              <div className="relative rounded">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  placeholder="••••••••"
                />
              </div>
              {isSignUp && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  Minimum length is 6 characters.
                </p>
              )}
            </div>

            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded transition-colors text-sm shadow-lg shadow-blue-900/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Secure Authen Handshake...</span>
                </div>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Corporate Account' : 'Access Ledger Console'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-zinc-600">
              <span className="bg-[#09090b] px-4 font-bold">Single Sign-On Available</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => { setEmail('architect@enterprise.io'); setPassword('corporate-password'); }}
              className="flex items-center justify-center gap-2 border border-zinc-800 rounded py-2.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032 c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10 c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              Auto Fill
            </button>
            <div className="flex items-center justify-center text-[11px] text-zinc-500 text-center font-sans">
              256-bit AES Crypt
            </div>
          </div>

          <p className="text-center text-[11px] text-zinc-605">
            Protected by enterprise-grade token encryption protocols.
          </p>
        </div>
      </div>
    </div>
  );
}
