import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await s.rpc('get_policies_for_table', { table_name: 'poll_objects' });

    // If RPC doesn't exist, we can't query pg_policies easily via JS client unless we wrap it in a function.
    // Alternative: Just try to select as ANON and see what happens.

    // 1. Service Role Select (Find a Stage 0 object with points)
    const { data: target } = await s
        .from('poll_objects')
        .select('*')
        .gt('points', 0)
        .limit(1)
        .maybeSingle();

    if (!target) {
        console.log("No objects with points found in DB.");
        return;
    }

    console.log(`Target Object: ${target.id} (Points: ${target.points})`);

    // 2. Anon Select (Target Permissions)
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: anonData, error: anonError } = await anon
        .from('poll_objects')
        .select('id, text, points')
        .eq('id', target.id)
        .single();

    console.log("Anon Select Result:", anonData);
    if (anonError) console.log("Anon Error:", anonError);

    if (anonData && anonData.points === target.points) {
        console.log("SUCCESS: Anon can read points.");
    } else {
        console.log("FAILURE: Anon missed points.");
    }
}

main();
