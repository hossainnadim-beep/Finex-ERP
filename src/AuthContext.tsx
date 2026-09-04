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

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Check if current URL contains recovery hash from password reset link
    if (window.location.hash && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'))) {
      setIsPasswordRecovery(true);
    }

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.warn('Supabase session verification notice:', sessionError.message);
            const errMsg = sessionError.message || '';
            if (
              errMsg.toLowerCase().includes('refresh') ||
              errMsg.toLowerCase().includes('token') ||
              errMsg.toLowerCase().includes('grant') ||
              sessionError.status === 400
            ) {
              clearStaleSupabaseSession();
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
              setSession(null);
              setUser(null);
              setSupabaseSession(null);
            }
          } else if (data?.session?.user) {
            const activeSession = data.session;
            const userSession: UserSession = {
              user: {
                id: activeSession.user.id,
                email: activeSession.user.email || 'user@supabase.co'
              },
              mode: 'supabase',
              supabaseConfigured: true
            };
            setSession(userSession);
            setUser({
              id: activeSession.user.id,
              email: activeSession.user.email || 'user@supabase.co'
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
          if (errMsg.toLowerCase().includes('refresh') || errMsg.toLowerCase().includes('token')) {
            clearStaleSupabaseSession();
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
          setSession(null);
          setUser(null);
          setSupabaseSession(null);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          }

          if (currentSession?.user) {
            const userSession: UserSession = {
              user: {
                id: currentSession.user.id,
                email: currentSession.user.email || 'user@supabase.co'
              },
              mode: 'supabase',
              supabaseConfigured: true
            };
            setSession(userSession);
            setUser({
              id: currentSession.user.id,
              email: currentSession.user.email || 'user@supabase.co'
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
  const { session, loading, setSession } = useAuth();

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

  if (!session) {
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
