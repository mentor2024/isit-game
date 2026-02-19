const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVotes() {
    const email = 'mentorofaio@gmail.com';
    console.log(`Checking votes for ${email}...`);

    // 1. Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("User not found!");
        return;
    }
    console.log(`User ID: ${user.id}`);

    // 2. Get Profile
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    console.log(`Profile: Stage ${profile.current_stage}, Level ${profile.current_level}`);

    // 3. Get Stage 0 Polls
    const { data: polls } = await supabase.from('polls').select('id, title, poll_order, stage').eq('stage', 0).order('poll_order');
    console.log(`\nStage 0 Polls:`);
    polls.forEach(p => console.log(`- [${p.id}] Order ${p.poll_order}: ${p.title}`));

    // 4. Get Votes
    const { data: votes } = await supabase.from('poll_votes').select('poll_id, selected_object_id').eq('user_id', user.id);
    console.log(`\nTotal Votes: ${votes.length}`);
    votes.forEach(v => {
        const poll = polls.find(p => p.id === v.poll_id);
        if (poll) {
            console.log(`- Voted on [Stage ${poll.stage} Order ${poll.poll_order}] ${poll.title}`);
        } else {
            console.log(`- Voted on Poll ${v.poll_id} (Not in Stage 0 list)`);
        }
    });
}

checkVotes();
