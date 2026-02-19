
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolls() {
    console.log("Checking Stage 0 Polls...");
    const { data: polls, error } = await supabase
        .from('polls')
        .select('*')
        .eq('stage', 0)
        .order('poll_order', { ascending: true });

    if (error) {
        console.error("Error fetching polls:", error);
        return;
    }

    console.table(polls.map(p => ({
        id: p.id,
        title: p.title,
        stage: p.stage,
        level: p.level,
        order: p.poll_order
    })));
}

checkPolls();
