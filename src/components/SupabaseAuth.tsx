/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, clearStaleSupabaseSession } from '../supabaseClient';
import { 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  HelpCircle, 
  ArrowLeft,
  UserCheck,
  Check,
  Building2
} from 'lucide-react';
import { UserSession } from '../types';
import { useAuth } from '../AuthContext';

interface SupabaseAuthProps {
  onLoginSuccess: (session: UserSession) => void;
  statusMessage?: string;
}

type AuthView = 'signin' | 'signup' | 'forgot-password' | 'forgot-id' | 'update-password' | 'verify-code';

export default function SupabaseAuth({ onLoginSuccess }: SupabaseAuthProps) {
  const { isPasswordRecovery, setIsPasswordRecovery } = useAuth();

  const [view, setView] = useState<AuthView>(isPasswordRecovery ? 'update-password' : 'signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  
  // Verification code / token / link paste
  const [otpToken, setOtpToken] = useState<string>('');
  const [pastedLink, setPastedLink] = useState<string>('');

  // ID recovery lookup query state
  const [recoveryName, setRecoveryName] = useState<string>('');
  const [recoveryDomain, setRecoveryDomain] = useState<string>('enterprise.io');
  const [idLookupResult, setIdLookupResult] = useState<string | null>(null);

  // Mandatory Company Details at Registration
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLegalName, setCompanyLegalName] = useState<string>('');
  const [companyIndustry, setCompanyIndustry] = useState<string>('Technology & Software');
  const [companyCurrency, setCompanyCurrency] = useState<string>('USD');
  const [fiscalYearMonth, setFiscalYearMonth] = useState<number>(1);
  const [accountingMethod, setAccountingMethod] = useState<'Accrual' | 'Cash'>('Accrual');
  const [companyStreet, setCompanyStreet] = useState<string>('');
  const [companyCity, setCompanyCity] = useState<string>('');
  const [companyState, setCompanyState] = useState<string>('');
  const [companyZip, setCompanyZip] = useState<string>('');
  const [companyCountry, setCompanyCountry] = useState<string>('United States');
  const [companyTaxId, setCompanyTaxId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error' | 'info'; 
    message: string;
  } | null>(null);

  // Synchronize view if password recovery mode is detected in URL hash or handle auth error redirects
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes('error=') || hash.includes('error_description=')) {
        try {
          const hashParams = new URLSearchParams(hash.substring(1));
          const errorDesc = hashParams.get('error_description') || hashParams.get('error') || '';
          const decoded = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
          clearStaleSupabaseSession();
          setNotification({
            type: 'error',
            message: decoded || 'The authentication or recovery link is invalid or has expired. Please sign in or request a new link.'
          });
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        } catch (_) {}
      }
    }

    if (isPasswordRecovery) {
      setView('update-password');
      setNotification({
        type: 'info',
        message: 'Password recovery session detected. Please enter your new password below.'
      });
    }
  }, [isPasswordRecovery]);

  // Clear messages when changing views
  const switchView = (newView: AuthView) => {
    setView(newView);
    setNotification(null);
    setIdLookupResult(null);
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setOtpToken('');
    setPastedLink('');
  };

  /**
   * Handle user sign in with registered credentials
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setNotification({
        type: 'error',
        message: 'Please enter both your registered Email ID and password key.'
      });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setNotification({
        type: 'error',
        message: 'Supabase credentials are not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
      });
      return;
    }

    setLoading(true);
    try {
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Remote authentication server is not responding.')), 7000)
      );

      const signInPromise = supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: password,
      });

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error('Authentication succeeded but no user account details were returned.');
      }

      setNotification({
        type: 'success',
        message: 'Authenticated successfully. Initializing financial ledger console...'
      });

      setTimeout(() => {
        onLoginSuccess({
          user: { 
            id: data.user.id, 
            email: data.user.email || emailTrimmed 
          },
          mode: 'supabase',
          supabaseConfigured: true
        });
      }, 600);

    } catch (err: any) {
      const rawMessage = err?.message || 'Failed to authenticate.';
      
      let userFriendlyMessage = rawMessage;
      if (rawMessage.toLowerCase().includes('invalid login credentials')) {
        userFriendlyMessage = 'Invalid login credentials. Please verify your registered email ID and password, or use the recovery options below.';
      } else if (rawMessage.toLowerCase().includes('email not confirmed')) {
        userFriendlyMessage = 'Email address not yet confirmed. Please verify your email inbox or disable "Confirm email" in your Supabase Auth settings.';
      } else if (rawMessage.toLowerCase().includes('failed to fetch') || rawMessage.toLowerCase().includes('network')) {
        userFriendlyMessage = 'Unable to reach the authentication server. Please check your internet connection and Supabase project status.';
      }

      setNotification({
        type: 'error',
        message: userFriendlyMessage
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle registration of a new registered user ID
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setNotification({
        type: 'error',
        message: 'Please enter both an Email ID and a password.'
      });
      return;
    }

    if (!companyName.trim()) {
      setNotification({
        type: 'error',
        message: 'Company Name is required. In FinexERP, all financial data must be associated with a registered company.'
      });
      return;
    }

    if (password.length < 6) {
      setNotification({
        type: 'error',
        message: 'Password key must be at least 6 characters in length.'
      });
      return;
    }

    // Save pending company details for automatic provisioning upon session creation
    const currencySymbolsMap: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', CAD: '$', AUD: '$', JPY: '¥', SGD: '$', INR: '₹', BDT: '৳', AED: 'د.إ', SAR: '﷼'
    };
    const pendingCompanyPayload = {
      name: companyName.trim(),
      legalName: companyLegalName.trim() || companyName.trim(),
      taxId: companyTaxId.trim() || '12-3456789',
      industry: companyIndustry,
      companyType: 'Corporation',
      email: emailTrimmed,
      phone: '+1 (800) 555-0199',
      website: '',
      currency: companyCurrency,
      currencySymbol: currencySymbolsMap[companyCurrency] || '$',
      address: {
        street: companyStreet.trim() || '100 Business Parkway, Suite 100',
        city: companyCity.trim() || 'San Francisco',
        state: companyState.trim() || 'CA',
        zip: companyZip.trim() || '94105',
        country: companyCountry.trim() || 'United States'
      },
      legalAddress: {
        street: companyStreet.trim() || '100 Business Parkway, Suite 100',
        city: companyCity.trim() || 'San Francisco',
        state: companyState.trim() || 'CA',
        zip: companyZip.trim() || '94105',
        country: companyCountry.trim() || 'United States'
      },
      customerFacingAddress: {
        street: companyStreet.trim() || '100 Business Parkway, Suite 100',
        city: companyCity.trim() || 'San Francisco',
        state: companyState.trim() || 'CA',
        zip: companyZip.trim() || '94105',
        country: companyCountry.trim() || 'United States'
      },
      fiscalYearStartMonth: Number(fiscalYearMonth) || 1,
      taxYearStartMonth: Number(fiscalYearMonth) || 1,
      accountingMethod: accountingMethod,
      closeBooks: false,
      closingDate: null,
      closingPassword: '',
      defaultInvoiceTerms: 'Net 30',
      defaultSalesMessage: 'Thank you for your business!'
    };
    try {
      localStorage.setItem(`finex_pending_registration_company_${emailTrimmed}`, JSON.stringify(pendingCompanyPayload));
    } catch (_) {}

    if (!isSupabaseConfigured || !supabase) {
      setNotification({
        type: 'error',
        message: 'Supabase authentication service is not configured.'
      });
      return;
    }

    setLoading(true);
    try {
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Remote authentication server is not responding.')), 7000)
      );

      const signUpPromise = supabase.auth.signUp({
        email: emailTrimmed,
        password: password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as any;

      if (error) {
        throw error;
      }

      if (data?.user && !data?.session) {
        setNotification({
          type: 'success',
          message: 'Registration successful! A verification email has been dispatched. Please confirm your email to sign in (or turn off email confirmation in Supabase for instant logins).'
        });
      } else if (data?.session) {
        setNotification({
          type: 'success',
          message: 'Account registered and authenticated successfully!'
        });
        setTimeout(() => {
          onLoginSuccess({
            user: { 
              id: data.user.id, 
              email: data.user.email || emailTrimmed 
            },
            mode: 'supabase',
            supabaseConfigured: true
          });
        }, 700);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Registration failed. Please try a different email ID.'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle sending password reset email via Supabase Auth
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setNotification({
        type: 'error',
        message: 'Please provide your registered Email ID.'
      });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setNotification({
        type: 'error',
        message: 'Supabase auth backend is not configured.'
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setNotification({
        type: 'success',
        message: `Password reset email dispatched to ${emailTrimmed}. If clicking the email link opens a "Page not found" error, you can copy the link/code and use the "Enter Code / Paste Link" tab below!`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to dispatch password reset request. Please verify your email format.'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle verifying OTP code or pasted reset link directly in app
   */
  const handleVerifyOtpOrLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!supabase) {
      setNotification({ type: 'error', message: 'Supabase client is not available.' });
      return;
    }

    const emailTrimmed = email.trim();
    const tokenInput = otpToken.trim();
    const linkInput = pastedLink.trim();

    if (!tokenInput && !linkInput) {
      setNotification({
        type: 'error',
        message: 'Please enter the 6-digit code OR paste the reset link from your email.'
      });
      return;
    }

    setLoading(true);
    try {
      // If user pasted a link, parse token / access_token / token_hash from it
      if (linkInput) {
        let extractedToken = '';
        let extractedAccessToken = '';
        let extractedRefreshToken = '';
        let extractedTokenHash = '';

        try {
          // Parse hash fragments (#access_token=... or #token=...)
          if (linkInput.includes('#')) {
            const hashPart = linkInput.split('#')[1];
            const params = new URLSearchParams(hashPart);
            extractedAccessToken = params.get('access_token') || '';
            extractedRefreshToken = params.get('refresh_token') || '';
            extractedToken = params.get('token') || '';
          }

          // Parse query parameters (?token=... or ?token_hash=...)
          if (linkInput.includes('?')) {
            const queryPart = linkInput.split('?')[1].split('#')[0];
            const params = new URLSearchParams(queryPart);
            extractedToken = extractedToken || params.get('token') || '';
            extractedTokenHash = params.get('token_hash') || '';
          }
        } catch {
          // Fallback regex extraction
          const tokenMatch = linkInput.match(/[?&#]token=([^&#]+)/);
          if (tokenMatch) extractedToken = decodeURIComponent(tokenMatch[1]);
          const hashMatch = linkInput.match(/[?&#]token_hash=([^&#]+)/);
          if (hashMatch) extractedTokenHash = decodeURIComponent(hashMatch[1]);
          const accessMatch = linkInput.match(/[?&#]access_token=([^&#]+)/);
          if (accessMatch) extractedAccessToken = decodeURIComponent(accessMatch[1]);
        }

        if (extractedAccessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: extractedAccessToken,
            refresh_token: extractedRefreshToken || '',
          });
          if (sessionError) throw sessionError;

          setIsPasswordRecovery(true);
          setView('update-password');
          setNotification({
            type: 'success',
            message: 'Session verified from link! Please enter your new password.'
          });
          setLoading(false);
          return;
        }

        if (extractedTokenHash) {
          const { error: hashError } = await supabase.auth.verifyOtp({
            token_hash: extractedTokenHash,
            type: 'recovery',
          });
          if (hashError) throw hashError;

          setIsPasswordRecovery(true);
          setView('update-password');
          setNotification({
            type: 'success',
            message: 'Token verified! Please enter your new password.'
          });
          setLoading(false);
          return;
        }

        if (extractedToken) {
          if (!emailTrimmed) {
            setNotification({
              type: 'error',
              message: 'Please enter your registered Email ID along with the token.'
            });
            setLoading(false);
            return;
          }

          const { error: otpError } = await supabase.auth.verifyOtp({
            email: emailTrimmed,
            token: extractedToken,
            type: 'recovery',
          });
          if (otpError) throw otpError;

          setIsPasswordRecovery(true);
          setView('update-password');
          setNotification({
            type: 'success',
            message: 'Token verified! Please enter your new password.'
          });
          setLoading(false);
          return;
        }
      }

      // If user provided a manual 6-digit code or raw token
      if (tokenInput) {
        if (!emailTrimmed) {
          setNotification({
            type: 'error',
            message: 'Please enter your registered Email ID above to verify the code.'
          });
          setLoading(false);
          return;
        }

        // Try standard verifyOtp with recovery type
        const { error: otpErr } = await supabase.auth.verifyOtp({
          email: emailTrimmed,
          token: tokenInput,
          type: 'recovery',
        });

        if (otpErr) {
          // Attempt verify as token_hash if string is long
          if (tokenInput.length > 10) {
            const { error: hashErr } = await supabase.auth.verifyOtp({
              token_hash: tokenInput,
              type: 'recovery',
            });
            if (hashErr) throw otpErr;
          } else {
            throw otpErr;
          }
        }

        setIsPasswordRecovery(true);
        setView('update-password');
        setNotification({
          type: 'success',
          message: 'Code verified successfully! Please enter your new password.'
        });
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid refresh token') || msg.includes('refresh token not found') || msg.includes('invalid_grant')) {
        clearStaleSupabaseSession();
        setNotification({
          type: 'error',
          message: 'The password reset token or link has expired or was already used. Please request a new reset email.'
        });
      } else {
        setNotification({
          type: 'error',
          message: err?.message || 'Invalid or expired reset code. Please request a new reset email.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle setting a new password when in recovery session
   */
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!newPassword || newPassword.length < 6) {
      setNotification({
        type: 'error',
        message: 'New password must be at least 6 characters in length.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotification({
        type: 'error',
        message: 'Passwords do not match. Please re-enter.'
      });
      return;
    }

    if (!supabase) {
      setNotification({
        type: 'error',
        message: 'Supabase service is not initialized.'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNotification({
        type: 'success',
        message: 'Password successfully updated! Logging into financial ledger...'
      });

      setIsPasswordRecovery(false);

      if (data?.user) {
        setTimeout(() => {
          onLoginSuccess({
            user: {
              id: data.user.id,
              email: data.user.email || email || 'user@enterprise.io'
            },
            mode: 'supabase',
            supabaseConfigured: true
          });
        }, 800);
      } else {
        setTimeout(() => {
          switchView('signin');
        }, 1200);
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid refresh token') || msg.includes('refresh token not found') || msg.includes('invalid_grant')) {
        clearStaleSupabaseSession();
        setNotification({
          type: 'error',
          message: 'Your recovery session has expired. Please request a fresh password reset link.'
        });
      } else {
        setNotification({
          type: 'error',
          message: err?.message || 'Failed to update password. Your recovery session may have expired. Please request a new link.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle ID recovery format helper
   */
  const handleLookupId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryName.trim()) return;

    const formatted = recoveryName.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@' + recoveryDomain.trim().toLowerCase();
    setIdLookupResult(formatted);
    setEmail(formatted);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row relative overflow-hidden" id="supabase-auth-screen">
      {/* Ambient decorative glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Left panel: Enterprise information and audit security */}
      <div className="w-full md:w-5/12 bg-[#121214] border-b md:border-b-0 md:border-r border-zinc-800 p-8 lg:p-12 flex flex-col justify-between">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-900/20">
                F
              </div>
              <span className="text-xl font-semibold tracking-tight uppercase text-zinc-100 font-sans">
                FINEX<span className="text-blue-500">ERP</span>
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium text-blue-400 mb-4 tracking-wide">
              <span>Next-Gen Enterprise Financial Intelligence</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-light leading-tight text-zinc-100">
              Precision Accounting &amp; Real-Time ERP
            </h1>
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed max-w-sm">
              Empowering agile enterprises with autonomous double-entry ledgers, unified multi-entity financials, and audit-grade compliance.
            </p>
          </div>

          {/* Security Status */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 p-4.5 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Authentication Security</span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                STRICT REGISTERED ONLY
              </span>
            </div>
            
            <div className="text-xs text-zinc-400 font-sans space-y-1">
              <span className="text-zinc-200 font-semibold block">Supabase Enterprise Auth</span>
              <p className="text-zinc-500 text-[11px] leading-normal">
                Only verified credentials with cryptographic tokens can access corporate financial ledgers and journals.
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>Credential Protocol:</span>
                <span className="text-blue-400 font-semibold">SUPABASE AUTH v2 (JWT)</span>
              </div>
              <div className="flex justify-between">
                <span>Recovery Support:</span>
                <span className="text-emerald-400 font-semibold">EMAIL OTP &amp; RESET LINK</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-0 flex items-center gap-6 opacity-40 text-[10px] text-zinc-400 uppercase tracking-widest font-bold font-mono">
          <span>SECURE AUDIT PORTAL</span>
          <span>SOC2 TYPE II</span>
          <span>GAAP READY</span>
        </div>
      </div>

      {/* Right panel: Dynamic Authentication / Recovery Forms */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">

          {/* Form Header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
                {view === 'signin' && 'Sign in to Console'}
                {view === 'signup' && 'Register Account'}
                {view === 'forgot-password' && 'Reset Password'}
                {view === 'verify-code' && 'Enter Code / Paste Link'}
                {view === 'forgot-id' && 'Recover Registered ID'}
                {view === 'update-password' && 'Set New Password'}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                Verified Portal
              </span>
            </div>
            <p className="text-slate-600 text-xs">
              {view === 'signin' && 'Enter your registered email ID and password key to continue.'}
              {view === 'signup' && 'Create a verified corporate account to access the double-entry ledger.'}
              {view === 'forgot-password' && 'Enter your registered email to receive secure recovery instructions.'}
              {view === 'verify-code' && 'Enter the code or paste the reset link from your email to update password.'}
              {view === 'forgot-id' && 'Verify your corporate identity or lookup your registered domain ID.'}
              {view === 'update-password' && 'Enter and confirm your new secure password to restore access.'}
            </p>
          </div>

          {/* Tab selector for Sign In / Sign Up (visible on sign in & sign up views) */}
          {(view === 'signin' || view === 'signup') && (
            <div className="flex border-b border-slate-200 text-xs font-semibold gap-2 select-none">
              <button
                type="button"
                onClick={() => switchView('signin')}
                className={`pb-3 px-4 border-b-2 transition-all cursor-pointer ${
                  view === 'signin'
                    ? 'border-blue-600 text-blue-600 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
                id="tab-signin"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchView('signup')}
                className={`pb-3 px-4 border-b-2 transition-all cursor-pointer ${
                  view === 'signup'
                    ? 'border-blue-600 text-blue-600 font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
                id="tab-signup"
              >
                Create Account
              </button>
            </div>
          )}

          {/* Notification Banner */}
          {notification && (
            <div className={`p-4 rounded-lg border text-xs shadow-sm flex items-start gap-2.5 ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : notification.type === 'info'
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`} id="auth-alert-message">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : notification.type === 'info' ? (
                <KeyRound className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-[11px] uppercase tracking-wider mb-0.5">
                  {notification.type === 'success' ? 'Success' : notification.type === 'info' ? 'Notice' : 'Authentication Error'}
                </div>
                <div className="text-xs leading-relaxed font-sans font-medium">
                  {notification.message}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: SIGN IN FORM */}
          {view === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="email" className="uppercase tracking-wider text-slate-700 font-bold">
                    Registered Email ID
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot-id')}
                    className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline text-[11px]"
                    id="link-forgot-id-top"
                  >
                    Forget ID?
                  </button>
                </div>
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
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="password" className="uppercase tracking-wider text-slate-700 font-bold">
                    Password Key
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot-password')}
                    className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline text-[11px]"
                    id="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
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
              </div>

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
                      <span>Verifying Credentials...</span>
                    </div>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => switchView('forgot-id')}
                  className="text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
                  id="link-forgot-id-bottom"
                >
                  Forget ID?
                </button>
                <button
                  type="button"
                  onClick={() => switchView('verify-code')}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                >
                  Have a Reset Code / Link?
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: SIGN UP / REGISTER FORM WITH MANDATORY COMPANY PROFILE */}
          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="bg-blue-50/60 p-3 rounded border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Multi-Company Architecture:</strong> All data in FinexERP is strictly tagged with a company. Please provide your business details below to initialize your company ledger.
                </span>
              </div>

              {/* User Account Credentials */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                  1. User Account Credentials
                </h4>
                
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    Corporate Email ID *
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                      placeholder="user@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="uppercase tracking-wider text-slate-700 font-bold text-xs">
                    Create Password Key *
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Must be at least 6 characters.
                  </p>
                </div>
              </div>

              {/* Company Details & Profile (Required) */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                  2. Company Details & Financial Setup
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company Business Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Global Technologies"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Legal Registered Name</label>
                    <input
                      type="text"
                      value={companyLegalName}
                      onChange={(e) => setCompanyLegalName(e.target.value)}
                      placeholder="e.g. Apex Global Technologies Inc."
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Industry Classification</label>
                    <select
                      value={companyIndustry}
                      onChange={(e) => setCompanyIndustry(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="Technology & Software">Technology & Software / SaaS</option>
                      <option value="Professional & Financial Services">Professional & Financial Services</option>
                      <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                      <option value="Manufacturing & Wholesale">Manufacturing & Wholesale</option>
                      <option value="Logistics & Transportation">Logistics & Transportation</option>
                      <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                      <option value="Construction & Real Estate">Construction & Real Estate</option>
                      <option value="Hospitality & Food Services">Hospitality & Food Services</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Operating Currency</label>
                    <select
                      value={companyCurrency}
                      onChange={(e) => setCompanyCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                      <option value="GBP">GBP - British Pound (£)</option>
                      <option value="CAD">CAD - Canadian Dollar ($)</option>
                      <option value="AUD">AUD - Australian Dollar ($)</option>
                      <option value="JPY">JPY - Japanese Yen (¥)</option>
                      <option value="SGD">SGD - Singapore Dollar ($)</option>
                      <option value="INR">INR - Indian Rupee (₹)</option>
                      <option value="BDT">BDT - Bangladeshi Taka (৳)</option>
                      <option value="AED">AED - UAE Dirham (د.إ)</option>
                      <option value="SAR">SAR - Saudi Riyal (﷼)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Financial Year Start</label>
                    <select
                      value={fiscalYearMonth}
                      onChange={(e) => setFiscalYearMonth(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value={1}>January (Standard Calendar Year)</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April (UK / Commonwealth Standard)</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July (US Federal / State Standard)</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October (US Federal Govt)</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Accounting Method</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                        <input
                          type="radio"
                          name="regAccountingMethod"
                          value="Accrual"
                          checked={accountingMethod === 'Accrual'}
                          onChange={() => setAccountingMethod('Accrual')}
                          className="text-blue-600"
                        />
                        <span>Accrual (GAAP)</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                        <input
                          type="radio"
                          name="regAccountingMethod"
                          value="Cash"
                          checked={accountingMethod === 'Cash'}
                          onChange={() => setAccountingMethod('Cash')}
                          className="text-blue-600"
                        />
                        <span>Cash Basis</span>
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Company Street Address</label>
                    <input
                      type="text"
                      value={companyStreet}
                      onChange={(e) => setCompanyStreet(e.target.value)}
                      placeholder="100 Enterprise Boulevard, Suite 500"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="San Francisco"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={companyState}
                      onChange={(e) => setCompanyState(e.target.value)}
                      placeholder="CA"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ZIP / Postal Code</label>
                    <input
                      type="text"
                      value={companyZip}
                      onChange={(e) => setCompanyZip(e.target.value)}
                      placeholder="94105"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tax ID / EIN</label>
                    <input
                      type="text"
                      value={companyTaxId}
                      onChange={(e) => setCompanyTaxId(e.target.value)}
                      placeholder="12-3456789"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  id="auth-signup-button"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-all text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span>Initializing Company & Registering Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Register & Create Company</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOT PASSWORD (EMAIL RESET LINK) */}
          {view === 'forgot-password' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => switchView('signin')}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    Registered Email ID
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                      placeholder="name@company.com"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    A secure password recovery link will be sent to your registered address.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-all text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                        <span>Sending Recovery Email...</span>
                      </div>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>Send Password Reset Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchView('verify-code')}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium py-2 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Already have the reset link or code? Click here</span>
                  </button>
                </div>
              </form>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                  <span>Why does the email link show "Page not found"?</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  By default, Supabase email links point to <code className="bg-slate-200 px-1 rounded">localhost:3000</code>. To fix this:
                </p>
                <ol className="text-[11px] list-decimal list-inside space-y-1 text-slate-700 font-sans">
                  <li>In your email, right-click the reset button $\rightarrow$ <strong>Copy Link Address</strong></li>
                  <li>Click <strong>"Already have the reset link or code"</strong> above and paste it directly!</li>
                </ol>
              </div>
            </div>
          )}

          {/* VIEW 4: DIRECT CODE / LINK PASTE VERIFICATION (Fixes Page Not Found) */}
          {view === 'verify-code' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => switchView('signin')}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>

              <form onSubmit={handleVerifyOtpOrLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="verify-email" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    Registered Email ID
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="verify-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-mono"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="verify-link" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    Paste Reset Link from Email (Recommended)
                  </label>
                  <textarea
                    id="verify-link"
                    rows={2}
                    value={pastedLink}
                    onChange={(e) => setPastedLink(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-mono resize-none"
                    placeholder="Copy the link from your email and paste it here (e.g. https://poaakjzbshdekjfvttve.supabase.co/auth/v1/verify?... or http://localhost:3000#access_token=...)"
                  />
                </div>

                <div className="relative py-1 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                  <span className="absolute left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] text-slate-500 uppercase font-bold">
                    OR 6-Digit Code
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="verify-token" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    6-Digit Reset Code / Token
                  </label>
                  <input
                    id="verify-token"
                    type="text"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-mono tracking-widest text-center font-bold"
                    placeholder="123456"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-all text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                        <span>Verifying Reset Credentials...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Verify &amp; Proceed to Set New Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 5: FORGOT ID / ACCOUNT LOOKUP */}
          {view === 'forgot-id' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => switchView('signin')}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>

              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>Registered ID Recovery &amp; Support</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Your registered ID is the corporate email address used when creating your FinexERP account. If you are unsure of your exact ID format, use the domain format helper below or contact your IT audit administrator.
                </p>

                <form onSubmit={handleLookupId} className="pt-2 space-y-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-600">
                    Corporate Username or Alias
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={recoveryName}
                      onChange={(e) => setRecoveryName(e.target.value)}
                      placeholder="e.g. jsmith or nadim"
                      className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                    />
                    <select
                      value={recoveryDomain}
                      onChange={(e) => setRecoveryDomain(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-2 text-xs text-slate-800 font-mono"
                    >
                      <option value="enterprise.io">@enterprise.io</option>
                      <option value="finexerp.com">@finexerp.com</option>
                      <option value="gmail.com">@gmail.com</option>
                      <option value="corporate.org">@corporate.org</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-3 rounded text-xs transition-colors cursor-pointer"
                  >
                    Format &amp; Apply Email ID
                  </button>
                </form>

                {idLookupResult && (
                  <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 space-y-1">
                    <span className="font-semibold block">Formatted Registered ID:</span>
                    <code className="font-mono text-xs font-bold text-blue-700 block">{idLookupResult}</code>
                    <button
                      type="button"
                      onClick={() => switchView('signin')}
                      className="mt-1 text-blue-600 hover:underline font-semibold text-[11px] block cursor-pointer"
                    >
                      → Proceed to Sign In with this ID
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-1 flex justify-between items-center text-xs">
                <span className="text-slate-500">Need password reset instead?</span>
                <button
                  type="button"
                  onClick={() => switchView('forgot-password')}
                  className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                >
                  Send Password Reset Link
                </button>
              </div>
            </div>
          )}

          {/* VIEW 6: SET NEW PASSWORD FORM (RECOVERY COMPLETION) */}
          {view === 'update-password' && (
            <div className="space-y-4">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    New Password Key
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="new-password"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                      placeholder="New password (min 6 chars)"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="block text-xs uppercase tracking-wider text-slate-700 font-bold">
                    Confirm New Password
                  </label>
                  <div className="relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-mono"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded transition-all text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                        <span>Updating Password Key...</span>
                      </div>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Save New Password &amp; Enter Console</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsPasswordRecovery(false);
                  switchView('signin');
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
              >
                Cancel and return to Sign In
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-500 pt-2">
            Protected by enterprise-grade cryptographic authentication protocols.
          </p>

        </div>
      </div>
    </div>
  );
}
