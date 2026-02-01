const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log("Checking Stage 0 Polls...");
    const { data: polls, error } = await supabase
        .from('polls')
        .select('id, title, poll_order, type, stage, level')
        .eq('stage', 0)
        .order('poll_order');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${polls.length} polls in Stage 0:`);
        polls.forEach(p => {
            console.log(`- Order ${p.poll_order}: [${p.type}] ${p.title} (${p.id})`);
        });
    }

    console.log("\nChecking User Profiles at Stage 0...");
    const { data: users } = await supabase.from('user_profiles').select('id, email, current_stage').eq('current_stage', 0);
    console.log(`Users at Stage 0: ${users?.length || 0}`);
}

check();
