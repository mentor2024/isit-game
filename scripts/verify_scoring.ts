
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verify() {
    console.log("🔍 Verifying Scoring System...\n");

    // 1. Check user_profiles schema
    console.log("1. Checking if 'score' column exists in user_profiles...");
    const { data: profileCheck, error: profileError } = await supabase
        .from('user_profiles')
        .select('score')
        .limit(1);

    if (profileError) {
        if (profileError.message.includes('does not exist')) {
            console.error("❌ 'score' columnMISSING in user_profiles. Migration '20260125_add_user_score.sql' NOT applied.");
        } else {
            console.error("❌ Error checking profile:", profileError.message);
        }
    } else {
        console.log("✅ 'score' column exists.");
    }

    // 2. Check vote_isit RPC logic (by testing it)
    console.log("\n2. Testing 'vote_isit' logic...");

    // Create a temp user
    const email = `test_score_${Date.now()}@example.com`;
    const password = 'password123';

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError || !authData.user) {
        console.error("❌ Failed to create test user:", authError?.message);
        return;
    }
    const userId = authData.user.id;
    console.log(`   Created test user: ${userId}`);

    // Ensure profile exists (trigger should handle it, but wait a bit or insert if missing)
    // Checking profile
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (!profile) {
        console.warn("⚠️ Profile not created automatically. Manually inserting...");
        await supabase.from('user_profiles').insert({ id: userId, role: 'user' });
    }

    // Create a temp poll
    const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({ title: 'Test Score Poll', stage: 2, level: 3, poll_order: 1 })
        .select()
        .single();

    if (pollError || !poll) {
        console.error("❌ Failed to create test poll:", pollError?.message);
        // Cleanup user
        await supabase.auth.admin.deleteUser(userId);
        return;
    }
    console.log(`   Created test poll (Stage 2, Level 3). Expected Points: 6.`);

    // Add objects
    const obj1Id = `poll:${poll.id}:L`;
    const obj2Id = `poll:${poll.id}:R`;
    await supabase.from('poll_objects').insert([
        { id: obj1Id, poll_id: poll.id, text: 'A' },
        { id: obj2Id, poll_id: poll.id, text: 'B' }
    ]);

    // Vote!
    // Using RPC as the user (need to sign in or use service key with explicit user context if RPC supports it?
    // RPC uses auth.uid(). We can't easily spoof auth.uid() with service key in simple client usage without JWT.
    // However, we can use `supabase.auth.signInWithPassword` since we just created the user.

    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await userClient.auth.signInWithPassword({ email, password });

    const { error: voteError } = await userClient.rpc('vote_isit', {
        p_is_word_id: obj1Id,
        p_it_word_id: obj2Id,
        p_poll_id: poll.id
    });

    if (voteError) {
        console.error("❌ Vote Failed:", voteError.message);
    } else {
        console.log("   Vote Cast successfully.");
    }

    // Check Score
    const { data: finalProfile } = await supabase.from('user_profiles').select('score').eq('id', userId).single();

    if (finalProfile?.score === 6) {
        console.log(`✅ Score verified! User has ${finalProfile.score} points.`);
    } else {
        console.error(`❌ Score Check Failed. Expected 6, got ${finalProfile?.score}.`);
        console.error("   This implies the RPC function was NOT updated to include scoring logic.");
    }

    // Cleanup
    console.log("\nCleaning up...");
    await supabase.from('polls').delete().eq('id', poll.id);
    await supabase.auth.admin.deleteUser(userId);
    console.log("Done.");
}

verify().catch(console.error);
