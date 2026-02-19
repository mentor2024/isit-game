
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfig() {
    console.log("Checking Level Configuration for Stage 0 Level 1...");

    const { data, error } = await supabase
        .from('level_configurations')
        .select('*')
        .eq('stage', 2)
        .eq('level', 2);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No config found for Stage 0 Level 1.");
    } else {
        console.log("Config Found:");
        console.dir(data[0], { depth: null });

        if (data[0].score_tiers) {
            console.log("\nScore Tiers Content:");
            console.log(JSON.stringify(data[0].score_tiers, null, 2));
        } else {
            console.log("\nNo score_tiers defined.");
        }
    }
}

checkConfig();
