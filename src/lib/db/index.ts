import { createClient } from "@supabase/supabase-js";
import * as schema from "./schema";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Re-export schema for compatibility
export { schema };

// Helper type for the supabase client
export type SupabaseClient = typeof supabase;
