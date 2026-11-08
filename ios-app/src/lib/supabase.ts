import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };
export const SUPABASE_URL = extra.supabaseUrl ?? '';
export const SUPABASE_ANON = extra.supabaseAnonKey ?? '';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
