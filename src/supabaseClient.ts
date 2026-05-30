/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

// Determine if Supabase has been properly configured in the environment
export const isSupabaseConfigured = 
  supabaseUrl.trim() !== '' && 
  supabaseUrl !== 'https://your-supabase-project-id.supabase.co' &&
  supabaseAnonKey.trim() !== '' && 
  supabaseAnonKey !== 'your-supabase-anon-key';

// Initialize the Supabase Client safely.
// If not configured, we export null to prevent blocking the app from rendering.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Diagnostic utility to test connection to Supabase Auth or database.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { 
      success: false, 
      message: 'Supabase URL or Anon Key is missing or default. Add real values to environment keys to connect.' 
    };
  }

  try {
    // Attempt a lightweight authentication status query to check if keys are rejected
    await supabase.auth.getSession();
    return {
      success: true,
      message: 'Successfully connected to Supabase API and authenticated!'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to authenticate with Supabase. Check credentials configuration.'
    };
  }
}
