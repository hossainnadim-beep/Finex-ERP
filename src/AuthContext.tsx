/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, clearStaleSupabaseSession } from './supabaseClient';
import { UserSession } from './types';
import SupabaseAuth from './components/SupabaseAuth';

interface AuthContextType {
  session: UserSession | null;
  user: { id: string; email: string } | null;
  supabaseSession: any; // Raw Supabase session
  supabase: typeof supabase;
  isSupabaseConfigured: boolean;
  loading: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (isRecovery: boolean) => void;
  recoveryEmail: string | null;
  setRecoveryEmail: (email: string | null) => void;
  recoveryError: string | null;
  setRecoveryError: (error: string | null) => void;
  logout: () => Promise<void>;
  setSession: React.Dispatch<React.SetStateAction<UserSession | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';

      // 1. Detect if the email link redirect returned an error (e.g. token expired, invalid grant)
      if (hash.includes('error=') || search.includes('error=')) {
        try {
          const queryString = hash.includes('error=') ? hash.substring(1) : search.substring(1);
          const errorParams = new URLSearchParams(queryString);
          const errorDesc = errorParams.get('error_description') || errorParams.get('error') || '';
          const decoded = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
          setRecoveryError(decoded || 'This password reset link has expired or has already been used. Please request a new link.');
          // Remove error hash from URL cleanly
          window.history.replaceState(null, '', window.location.pathname);
        } catch (_) {}
      }

      // 2. Check if current URL contains recovery indicator
      const hasRecoveryIndicator = 
        hash.includes('type=recovery') || 
        search.includes('type=recovery') || 
        (hash.includes('access_token') && !hash.includes('type=signup'));

      if (hasRecoveryIndicator) {
        setIsPasswordRecovery(true);
      }

      if (isSupabaseConfigured && supabase) {
        // 3. Handle PKCE authorization code in search params (?code=...)
        if (search.includes('code=')) {
          try {
            const searchParams = new URLSearchParams(search);
            const code = searchParams.get('code');
            if (code) {
              const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
              if (!codeErr && codeData?.session) {
                setIsPasswordRecovery(true);
                if (codeData.session.user?.email) {
                  setRecoveryEmail(codeData.session.user.email);
                }
              } else if (codeErr) {
                setRecoveryError(codeErr.message || 'Verification code expired or invalid.');
              }
            }
          } catch (e: any) {
            console.warn('PKCE exchange error:', e);
          }
        }

        // 4. Handle direct token_hash in search params (?token_hash=...&type=recovery)
        if (search.includes('token_hash=')) {
          try {
            const searchParams = new URLSearchParams(search);
            const tokenHash = searchParams.get('token_hash');
            const tokenType = (searchParams.get('type') as any) || 'recovery';
            if (tokenHash) {
              const { data: hashData, error: hashErr } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: tokenType,
              });
              if (!hashErr && hashData?.session) {
                setIsPasswordRecovery(true);
                if (hashData.session.user?.email) {
                  setRecoveryEmail(hashData.session.user.email);
                }
              } else if (hashErr) {
                setRecoveryError(hashErr.message || 'Password reset token has expired or is invalid.');
              }
            }
          } catch (e: any) {
            console.warn('token_hash verify error:', e);
          }
        }

        // 5. Check existing session
        try {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.warn('Supabase session verification notice:', sessionError.message);
            const errMsg = sessionError.message || '';
            if (
              (errMsg.toLowerCase().includes('refresh') ||
               errMsg.toLowerCase().includes('token') ||
               errMsg.toLowerCase().includes('grant') ||
               sessionError.status === 400) &&
              !hasRecoveryIndicator
            ) {
              clearStaleSupabaseSession();
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
              setSession(null);
              setUser(null);
              setSupabaseSession(null);
            }
          } else if (data?.session?.user) {
            const activeSession = data.session;
            const userEmail = activeSession.user.email || 'user@supabase.co';
            setRecoveryEmail(userEmail);

            if (hasRecoveryIndicator) {
              setIsPasswordRecovery(true);
            }

            const userSession: UserSession = {
              user: {
                id: activeSession.user.id,
                email: userEmail
              },
              mode: 'supabase',
              supabaseConfigured: true
            };
            setSession(userSession);
            setUser({
              id: activeSession.user.id,
              email: userEmail
            });
            setSupabaseSession(activeSession);
          } else {
            setSession(null);
            setUser(null);
            setSupabaseSession(null);
          }
        } catch (error: any) {
          console.warn('Notice during Supabase session initialization:', error);
          const errMsg = error?.message || '';
          if (!hasRecoveryIndicator && (errMsg.toLowerCase().includes('refresh') || errMsg.toLowerCase().includes('token'))) {
            clearStaleSupabaseSession();
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
          setSession(null);
          setUser(null);
          setSupabaseSession(null);
        }

        // 6. Listen for Auth State changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          }
          if (typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))) {
            setIsPasswordRecovery(true);
          }

          if (currentSession?.user) {
            const userEmail = currentSession.user.email || 'user@supabase.co';
            setRecoveryEmail(userEmail);

            const userSession: UserSession = {
              user: {
                id: currentSession.user.id,
                email: userEmail
              },
              mode: 'supabase',
              supabaseConfigured: true
            };
            setSession(userSession);
            setUser({
              id: currentSession.user.id,
              email: userEmail
            });
            setSupabaseSession(currentSession);
          } else if (event === 'SIGNED_OUT' || !currentSession) {
            setSession(null);
            setUser(null);
            setSupabaseSession(null);
          }
        });
        authSubscription = subscription;
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (_) {}
      }
    }
    clearStaleSupabaseSession();
    setSession(null);
    setUser(null);
    setSupabaseSession(null);
    setIsPasswordRecovery(false);
    setRecoveryEmail(null);
    setRecoveryError(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      supabaseSession,
      supabase,
      isSupabaseConfigured,
      loading,
      isPasswordRecovery,
      setIsPasswordRecovery,
      recoveryEmail,
      setRecoveryEmail,
      recoveryError,
      setRecoveryError,
      logout,
      setSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading, isPasswordRecovery, setSession } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs text-zinc-400 font-mono">Authenticating Portal Session...</span>
        </div>
      </div>
    );
  }

  // CRITICAL: When a user clicks a password reset link in their email (isPasswordRecovery is true),
  // they MUST see the Set New Password interface, NOT the protected app ledger!
  if (isPasswordRecovery || !session) {
    return (
      <SupabaseAuth 
        onLoginSuccess={(userSession) => {
          setSession(userSession);
        }} 
      />
    );
  }

  return <>{children}</>;
};
