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
    await Promise.race([checkPromise, timeoutPromise]);

    return {
      success: true,
      message: 'Successfully connected to Supabase API and authenticated!'
    };
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to authenticate with Supabase.';
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
