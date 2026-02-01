
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkTiers() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: config, error } = await supabase
        .from('level_configurations')
        .select('*')
        .eq('stage', 0)
        .eq('level', 1)
        .single();

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Stage 0 Configuration:");
    // Visualize NBSP
    const rawJson = JSON.stringify(config.score_tiers, null, 2);
    const visualized = rawJson
        .replace(/&nbsp;/g, "[AMP_NBSP]")
        .replace(/\u00A0/g, "[UNICODE_NBSP]");

    console.log(visualized);

    const tiers = config.score_tiers;
    const sortedTiers = [...tiers].sort((a: any, b: any) => b.min_score - a.min_score);
    console.log("\nSorted Tiers (Logic Simulation):");
    console.log(JSON.stringify(sortedTiers, null, 2));

    const score = 98;
    const matched = sortedTiers.find((t: any) => score >= t.min_score);
    console.log(`\nMatching for Score ${score}:`, matched);
}

checkTiers();
