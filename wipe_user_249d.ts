import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const userId = "249d8322-1a44-4ab2-bcee-328eb4df933e";

    // Debug Points
    const { data: votes } = await s.from('poll_votes').select('points_earned').eq('user_id', userId);
    console.log("Votes Points:", votes?.map(v => v.points_earned));

    // Wipe Logic
    const { count: voteCount, error: vError } = await s.from('poll_votes').delete({ count: 'exact' }).eq('user_id', userId);
    console.log(`Deleted ${voteCount} votes.`);

    const { error: pError } = await s.from('user_profiles').update({ score: 0, current_stage: 0, current_level: 1 }).eq('id', userId);
    if (pError) console.error("Profile Reset Error", pError);
    else console.log("Profile reset.");
}
main();
