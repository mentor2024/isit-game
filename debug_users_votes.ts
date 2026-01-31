import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false }
    });

    // Get profiles
    const { data: profiles, error: pError } = await s.from('user_profiles').select('*');
    if (pError) { console.error("Profile Error", pError); return; }

    console.log(`--- DEBUG USER VOTES ---`);
    for (const p of profiles || []) {
        // Count votes
        const { count } = await s.from('poll_votes').select('*', { count: 'exact', head: true }).eq('user_id', p.id);

        // Get email 
        const { data: { user }, error: uError } = await s.auth.admin.getUserById(p.id);

        console.log(`UserID: ${p.id}`);
        console.log(`Email: ${user?.email || 'N/A'}`);
        console.log(`Role:  ${p.role}`);
        console.log(`Stage: ${p.current_stage} | Level: ${p.current_level} | Score: ${p.score}`);
        console.log(`Votes: ${count}`);
        console.log('-------------------------');
    }
}
main();
