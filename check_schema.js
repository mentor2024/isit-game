const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('poll_votes')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }
    console.log("Columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data found");
}

checkSchema();
