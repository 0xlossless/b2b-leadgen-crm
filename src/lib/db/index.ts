import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use Supabase connection - on Vercel this connects via IPv6 which works
const connectionString = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle>;

if (connectionString) {
  // Direct Postgres connection (works on Vercel which has IPv6)
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  db = drizzle(client, { schema });
} else {
  // Fallback: this shouldn't happen in production
  throw new Error("DATABASE_URL environment variable is required");
}

export { db, schema };
