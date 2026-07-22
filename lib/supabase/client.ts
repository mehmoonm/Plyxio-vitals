import { createClient } from '@supabase/supabase-js';

// These are the PUBLIC anon key and project URL — safe to ship client-side by design.
// Real access control is enforced entirely by the RLS policies on the database.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vgzwogzwkkslouhgiely.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnendvZ3p3a2tzbG91aGdpZWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDIyMzUsImV4cCI6MjA5ODk3ODIzNX0.W7lQwYltCw8q_q6xzj-RmtZ2ukQmTIPDqglO3C2-_sA';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
