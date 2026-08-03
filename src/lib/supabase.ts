import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type OwnerCredentials = {
  email: string;
  password: string;
};

export function getConfiguredOwnerEmail() {
  const value = import.meta.env.VITE_OWNER_EMAIL;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function getCurrentUserId() {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id) {
    return session.user.id;
  }

  return null;
}

export async function signInOwner(credentials: OwnerCredentials) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

export async function signOutOwner() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export function onAuthStateChange(callback: () => void) {
  if (!supabase) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    callback();
  });

  return () => {
    subscription.unsubscribe();
  };
}
