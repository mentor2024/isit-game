const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContent() {
    console.log("Checking level_configurations content...");
    const { data: configs, error } = await supabase
        .from('level_configurations')
        .select('stage, level, awareness_assessment')
        .order('stage', { ascending: true })
        .order('level', { ascending: true });

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (configs && configs.length > 0) {
        console.log("Found configurations:");
        configs.forEach(c => {
            const hasContent = c.awareness_assessment && c.awareness_assessment.length > 0;
            console.log(`- Stage ${c.stage}, Level ${c.level}: ${hasContent ? "✅ Has Content (" + c.awareness_assessment.substring(0, 20) + "...)" : "❌ EMPTY"}`);
        });
    } else {
        console.log("No level configurations found.");
    }
}

checkContent();
