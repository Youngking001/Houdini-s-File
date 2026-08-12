import { createClient } from "@supabase/supabase-js";

/**
 * Supabase project connection.
 *
 * The anon/public key below is safe to have in client-side code and in
 * a public GitHub repo — it's designed to be exposed. Access to your
 * data is controlled separately by Row Level Security (RLS) policies
 * on each table in the Supabase dashboard, not by keeping this key
 * secret. Never put the "service_role" key here or anywhere in this
 * project — that one IS secret.
 */
const supabaseUrl = "https://osrelodwmcuswcrxnblg.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcmVsb2R3bWN1c3djcnhuYmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzU5MjEsImV4cCI6MjEwMjA1MTkyMX0.rLeGX8Fq_8xOAxyngZSY2KDuuAV343lv4eo-LLvntog";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
