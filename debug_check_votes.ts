import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkVotes() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Checking recent votes...");
    const { data: votes, error } = await supabase
        .from('poll_votes')
        .select('*, polls(title, stage)')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching votes:", error);
        return;
    }

    if (votes?.length === 0) {
        console.log("No votes found.");
    } else {
        console.log(JSON.stringify(votes, null, 2));
    }
}

checkVotes();
