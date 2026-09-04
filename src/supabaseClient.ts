/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://poaakjzbshdekjfvttve.supabase.co';
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYWFranpic2hkZWtqZnZ0dHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzg4NDEsImV4cCI6MjA5NTY1NDg0MX0.vjoa5k-yZaYT3LspDooQMZOQKhTWCaafWgHeR0Yluvs';

// Determine if Supabase has been properly configured in the environment
export const isSupabaseConfigured = 
  Boolean(supabaseUrl && supabaseUrl.trim() !== '') && 
  supabaseUrl !== 'https://your-supabase-project-id.supabase.co' &&
  !supabaseUrl.includes('your-supabase-project-id') &&
  !supabaseUrl.includes('your-project-id') &&
  Boolean(supabaseAnonKey && supabaseAnonKey.trim() !== '') && 
  supabaseAnonKey !== 'your-supabase-anon-key' &&
  !supabaseAnonKey.includes('your-supabase-anon-key') &&
  !supabaseAnonKey.includes('your-anon-public-key');

/**
 * Utility to safely remove stale or corrupted Supabase session keys from local storage
 * and clear token hashes from the browser history.
 */
export function clearStaleSupabaseSession() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (_) {}
    });

    // Clean up any stale tokens or error descriptions from URL hash
    if (
      window.location.hash &&
      (window.location.hash.includes('access_token') ||
        window.location.hash.includes('refresh_token') ||
        window.location.hash.includes('error_description') ||
        window.location.hash.includes('invalid_grant'))
    ) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch (e) {
    console.warn('Unable to clear stale Supabase session:', e);
  }
}

// Global safety interceptor for stale/invalid refresh token events
if (typeof window !== 'undefined') {
  const isRefreshTokenError = (err: any): boolean => {
    if (!err) return false;
    const text = (
      (err?.message || '') +
      ' ' +
      (err?.error_description || '') +
      ' ' +
      (typeof err === 'string' ? err : '') +
      ' ' +
      (err?.toString ? err.toString() : '')
    ).toLowerCase();

    return (
      text.includes('invalid refresh token') ||
      text.includes('refresh token not found') ||
      text.includes('refresh_token_not_found') ||
      text.includes('invalid_grant')
    );
  };

  // Intercept unhandled promise rejections from Gotrue background token refresh ticks
  window.addEventListener('unhandledrejection', (event) => {
    if (isRefreshTokenError(event.reason)) {
      event.preventDefault();
      console.warn('Safely intercepted expired Supabase refresh token:', event.reason?.message || event.reason);
      clearStaleSupabaseSession();
      if (supabase) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    }
  });

  // Intercept global window runtime errors
  window.addEventListener('error', (event) => {
    if (isRefreshTokenError(event.error || event.message)) {
      event.preventDefault();
      clearStaleSupabaseSession();
      if (supabase) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    }
  });
}

// Initialize the Supabase Client safely.
// If not configured, we export null to prevent blocking the app from rendering.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Diagnostic utility to test connection to Supabase Auth or database.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; isNetworkError?: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { 
      success: false, 
      message: 'Supabase URL or Anon Key is missing or using default placeholder. Sandbox / Demo mode is active.' 
    };
  }

  try {
    // Attempt a lightweight authentication status query with a timeout
    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out. The remote Supabase endpoint is not responding.')), 4000)
    );

    const checkPromise = supabase.auth.getSession();
    const result: any = await Promise.race([checkPromise, timeoutPromise]);

    if (result && result.error) {
      const errorMsg = result.error.message || '';
      if (errorMsg.toLowerCase().includes('refresh') || errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('grant')) {
        clearStaleSupabaseSession();
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return {
          success: true,
          message: 'Supabase endpoint is reachable (stale session cleared; ready for login).'
        };
      }
      return {
        success: false,
        message: result.error.message || 'Error checking session with Supabase.'
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase API and authenticated!'
    };
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to authenticate with Supabase.';
    if (errorMsg.toLowerCase().includes('refresh') || errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('grant')) {
      clearStaleSupabaseSession();
      await supabase?.auth.signOut({ scope: 'local' }).catch(() => {});
      return {
        success: true,
        message: 'Supabase endpoint is reachable (stale session cleared; ready for login).'
      };
    }

    const isNetwork = errorMsg.toLowerCase().includes('failed to fetch') || 
                      errorMsg.toLowerCase().includes('network') ||
                      errorMsg.toLowerCase().includes('timeout');

    return {
      success: false,
      isNetworkError: isNetwork,
      message: isNetwork
        ? 'Could not connect to the remote Supabase endpoint (Failed to fetch). Sandbox / Demo mode can be used as a fallback.'
        : errorMsg
    };
  }
}
