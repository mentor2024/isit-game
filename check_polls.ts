import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkPolls() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: polls, error } = await supabase
        .from('polls')
        .select('id, title, stage, level, poll_order')
        .eq('stage', 0)
        .eq('level', 1);

    if (error) {
        console.error("Error fetching polls:", error);
    } else {
        console.log("Stage 0 Level 1 Polls:", polls);
    }

    const { count, error: voteError } = await supabase
        .from('poll_votes')
        .select('*', { count: 'exact', head: true });

    console.log("Total Votes in DB:", count, "Error:", voteError);

    if (count && count > 0) {
        console.log("Wiping votes...");
        const { error: deleteError } = await supabase.from('poll_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
        if (deleteError) console.error("Wipe failed:", deleteError);
        else console.log("Votes wiped successfully.");
    }
}

checkPolls();
