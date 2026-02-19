const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Service Client (Admin)
const adminClient = createClient(supabaseUrl, serviceKey);

async function debugScore() {
    // 1. Fetch user by email (mentor24...) - Hardcoded or list all
    // Since we don't know the exact email, list all profiles with score > 0
    console.log("--- Ground Truth (Service Role) ---");
    const { data: profiles, error: adminError } = await adminClient
        .from('user_profiles')
        .select('*');

    if (adminError) { console.error(adminError); return; }

    console.log(`Found ${profiles.length} profiles.`);
    profiles.forEach(p => console.log(`ID: ${p.id}, Score: ${p.score}`));

    if (profiles.length === 0) return;

    const targetUser = profiles[0]; // Assume the first one is our test user if only one
    console.log(`\nTesting Read for User: ${targetUser.id}`);

    // Impossible to fully test RLS from here without a visible session token.
    // But we can confirm the data is IN the DB.
}

debugScore();
