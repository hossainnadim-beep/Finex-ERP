/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserSession } from './types';
import SupabaseAuth from './components/SupabaseAuth';

interface AuthContextType {
  session: UserSession | null;
  user: { id: string; email: string } | null;
  supabaseSession: any; // Raw Supabase session
  supabase: typeof supabase;
  isSupabaseConfigured: boolean;
  loading: boolean;
  loginSandbox: (email: string) => void;
  logout: () => Promise<void>;
  setSession: React.Dispatch<React.SetStateAction<UserSession | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session: activeSession } } = await supabase.auth.getSession();
          if (activeSession?.user) {
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
          }
        } catch (error) {
          console.error('Error retrieving active Supabase session:', error);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
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
          } else if (event === 'SIGNED_OUT') {
            // Safe-guard to only clear if in supabase mode (retains active simulator sandbox state)
            setSession((prev) => (prev?.mode === 'supabase' ? null : prev));
            setUser((prev) => (prev && session?.mode === 'supabase' ? null : prev));
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

  const loginSandbox = (email: string) => {
    // Generate isolated user ID based on the cleaned email address
    const cleanId = 'sand-usr-' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const sandboxSession: UserSession = {
      user: { id: cleanId, email: email },
      mode: 'sandbox',
      supabaseConfigured: false
    };
    setSession(sandboxSession);
    setUser(sandboxSession.user);
    setSupabaseSession(null);
  };

  const logout = async () => {
    if (session?.mode === 'supabase' && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error during signOut:', err);
      }
    }
    setSession(null);
    setUser(null);
    setSupabaseSession(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      supabaseSession,
      supabase,
      isSupabaseConfigured,
      loading,
      loginSandbox,
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
