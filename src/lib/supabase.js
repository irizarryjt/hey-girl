import { createClient } from '@supabase/supabase-js'

// The anon key is safe to expose in the browser; RLS protects the data.
// If these aren't set, the app stays in local-only mode (no login required).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const supabaseEnabled = !!supabase
