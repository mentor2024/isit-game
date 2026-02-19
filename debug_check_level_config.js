const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking level_configurations columns...");
    const { data, error } = await supabase
        .from('level_configurations')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Existing columns:", Object.keys(data[0]));
        if (!Object.keys(data[0]).includes('awareness_assessment')) {
            console.log("❌ 'awareness_assessment' column is MISSING.");
        } else {
            console.log("✅ 'awareness_assessment' column EXISTS.");
        }
    } else {
        console.log("No rows found, cannot infer columns from empty table. Attempting to insert dummy to check schema error.");
    }
}

checkSchema();
