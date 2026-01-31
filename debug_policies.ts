import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    // Service Role to read catalog
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: policies, error } = await s
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'poll_objects');

    if (error) {
        console.error("Error fetching policies:", error);
        // Fallback: If we can't read pg_policies directly via Select, we might need an RPC or just infer it.
        // But usually Service Role can read system tables if enabled, or we use a raw SQL query via some other means?
        // Actually, Supabase JS client prevents querying system tables often.
        // We will try RPC if this fails.
    } else {
        console.table(policies);
    }
}

main();
