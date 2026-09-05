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

// Helper to detect if current window URL or session has an active password recovery flow
const checkIsRecoveryActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem('finex_direct_password_recovery') === 'true') {
      return true;
    }
  } catch (_) {}
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    hash.includes('recovery') ||
    search.includes('recovery') ||
    (hash.includes('access_token') && !hash.includes('type=signup') && !hash.includes('type=invite'))
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecoveryState] = useState<boolean>(checkIsRecoveryActive);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('finex_recovery_email');
      } catch (_) {}
    }
    return null;
  });
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const setIsPasswordRecovery = (active: boolean) => {
    setIsPasswordRecoveryState(active);
    if (typeof window !== 'undefined') {
      try {
        if (active) {
          sessionStorage.setItem('finex_direct_password_recovery', 'true');
        } else {
          sessionStorage.removeItem('finex_direct_password_recovery');
          sessionStorage.removeItem('finex_recovery_access_token');
          sessionStorage.removeItem('finex_recovery_refresh_token');
          sessionStorage.removeItem('finex_recovery_email');
        }
      } catch (_) {}
    }
  };

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
          setIsPasswordRecovery(false);
          // Remove error hash from URL cleanly
          window.history.replaceState(null, '', window.location.pathname);
        } catch (_) {}
      }

      // 2. Extract recovery parameters from URL if present
      let rawAccessToken = '';
      let rawRefreshToken = '';
      let rawType = '';
      let rawCode = '';
      let rawTokenHash = '';

      if (hash.includes('access_token=')) {
        try {
          const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
          const hashParams = new URLSearchParams(cleanHash);
          rawAccessToken = hashParams.get('access_token') || '';
          rawRefreshToken = hashParams.get('refresh_token') || '';
          rawType = hashParams.get('type') || '';
        } catch (_) {}
      }

      if (search.includes('code=')) {
        try {
          const searchParams = new URLSearchParams(search);
          rawCode = searchParams.get('code') || '';
        } catch (_) {}
      }

      if (search.includes('token_hash=')) {
        try {
          const searchParams = new URLSearchParams(search);
          rawTokenHash = searchParams.get('token_hash') || '';
        } catch (_) {}
      }

      // 3. Determine if current flow is an active password recovery
      const hasRecoveryIndicator = 
        rawType === 'recovery' ||
        hash.includes('type=recovery') || 
        search.includes('type=recovery') || 
        hash.includes('recovery') ||
        search.includes('recovery') ||
        Boolean(rawAccessToken && !hash.includes('type=signup') && !hash.includes('type=invite')) ||
        Boolean(rawTokenHash) ||
        (typeof window !== 'undefined' && sessionStorage.getItem('finex_direct_password_recovery') === 'true');

      if (hasRecoveryIndicator) {
        setIsPasswordRecovery(true);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('finex_direct_password_recovery', 'true');
            if (rawAccessToken) {
              sessionStorage.setItem('finex_recovery_access_token', rawAccessToken);
            }
            if (rawRefreshToken) {
              sessionStorage.setItem('finex_recovery_refresh_token', rawRefreshToken);
            }
          } catch (_) {}
        }
      }

      if (isSupabaseConfigured && supabase) {
        // Register Auth State change listener FIRST so no events are missed
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          const isRecoveryOngoing = 
            typeof window !== 'undefined' && 
            (sessionStorage.getItem('finex_direct_password_recovery') === 'true' ||
             window.location.hash.includes('recovery') ||
             window.location.search.includes('recovery'));

          if (event === 'PASSWORD_RECOVERY' || isRecoveryOngoing) {
            setIsPasswordRecovery(true);
            if (currentSession?.user?.email) {
              setRecoveryEmail(currentSession.user.email);
              try {
                sessionStorage.setItem('finex_recovery_email', currentSession.user.email);
              } catch (_) {}
            }
          }

          if (currentSession?.user) {
            const userEmail = currentSession.user.email || 'user@supabase.co';
            if (isRecoveryOngoing) {
              setRecoveryEmail(userEmail);
              try {
                sessionStorage.setItem('finex_recovery_email', userEmail);
              } catch (_) {}
            }

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
          } else if (event === 'SIGNED_OUT') {
            if (!isRecoveryOngoing) {
              setSession(null);
              setUser(null);
              setSupabaseSession(null);
            }
          }
        });
        authSubscription = subscription;

        // 4. Handle direct access_token in hash fragments
        const tokenToUse = rawAccessToken || (typeof window !== 'undefined' ? sessionStorage.getItem('finex_recovery_access_token') || '' : '');
        const refreshToUse = rawRefreshToken || (typeof window !== 'undefined' ? sessionStorage.getItem('finex_recovery_refresh_token') || '' : '');

        if (tokenToUse) {
          try {
            const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
              access_token: tokenToUse,
              refresh_token: refreshToUse,
            });
            if (!sessionErr && sessionData?.session?.user) {
              setIsPasswordRecovery(true);
              const uEmail = sessionData.session.user.email || '';
              if (uEmail) {
                setRecoveryEmail(uEmail);
                try {
                  sessionStorage.setItem('finex_recovery_email', uEmail);
                } catch (_) {}
              }
            }
          } catch (e: any) {
            console.warn('Direct hash session parsing notice:', e);
          }
        }

        // 5. Handle PKCE authorization code in search params (?code=...)
        if (rawCode) {
          try {
            const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(rawCode);
            if (!codeErr && codeData?.session) {
              setIsPasswordRecovery(true);
              if (codeData.session.user?.email) {
                setRecoveryEmail(codeData.session.user.email);
                try {
                  sessionStorage.setItem('finex_recovery_email', codeData.session.user.email);
                } catch (_) {}
              }
            } else if (codeErr) {
              setRecoveryError(codeErr.message || 'Verification code expired or invalid.');
            }
          } catch (e: any) {
            console.warn('PKCE exchange error:', e);
          }
        }

        // 6. Handle direct token_hash in search params (?token_hash=...&type=recovery)
        if (rawTokenHash) {
          try {
            const { data: hashData, error: hashErr } = await supabase.auth.verifyOtp({
              token_hash: rawTokenHash,
              type: 'recovery',
            });
            if (!hashErr && hashData?.session) {
              setIsPasswordRecovery(true);
              if (hashData.session.user?.email) {
                setRecoveryEmail(hashData.session.user.email);
                try {
                  sessionStorage.setItem('finex_recovery_email', hashData.session.user.email);
                } catch (_) {}
              }
            } else if (hashErr) {
              setRecoveryError(hashErr.message || 'Password reset token has expired or is invalid.');
            }
          } catch (e: any) {
            console.warn('token_hash verify error:', e);
          }
        }

        // Clean up URL hash so tokens are safely sequestered in storage
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          try {
            window.history.replaceState(null, '', window.location.pathname + (window.location.search || '?type=recovery'));
          } catch (_) {}
        }

        // 7. Check existing session
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
            if (hasRecoveryIndicator) {
              setRecoveryEmail(userEmail);
              try {
                sessionStorage.setItem('finex_recovery_email', userEmail);
              } catch (_) {}
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
            // If getSession returned null, but we have recovery tokens saved, restore them
            const savedAt = typeof window !== 'undefined' ? sessionStorage.getItem('finex_recovery_access_token') : null;
            const savedRt = typeof window !== 'undefined' ? sessionStorage.getItem('finex_recovery_refresh_token') : null;
            if (savedAt) {
              const { data: restored, error: rErr } = await supabase.auth.setSession({
                access_token: savedAt,
                refresh_token: savedRt || '',
              });
              if (!rErr && restored?.session?.user) {
                const uEmail = restored.session.user.email || 'user@supabase.co';
                setRecoveryEmail(uEmail);
                setIsPasswordRecovery(true);
                setSession({
                  user: { id: restored.session.user.id, email: uEmail },
                  mode: 'supabase',
                  supabaseConfigured: true
                });
                setUser({ id: restored.session.user.id, email: uEmail });
                setSupabaseSession(restored.session);
              }
            } else {
              setSession(null);
              setUser(null);
              setSupabaseSession(null);
            }
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
