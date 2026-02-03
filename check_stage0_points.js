
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPoints() {
    const { data: polls, error } = await supabase
        .from('polls')
        .select(`
            id, 
            title, 
            poll_order, 
            type,
            poll_objects (
                id,
                text,
                points
            ),
            quad_scores
        `)
        .eq('stage', 0)
        .order('poll_order');

    if (error) {
        console.error(error);
        return;
    }

    let totalMax = 0;

    console.log("--- STAGE 0 CONFIG ---");
    polls.forEach(p => {
        console.log(`Poll ${p.poll_order}: ${p.title} (${p.type})`);

        let maxPollPoints = 0;
        if (p.type === 'quad_sorting') {
            console.log("  Quad Scores:", p.quad_scores);
            // Assuming max pair?
            // Actually, Quad max is determined by finding the best pair.
            // Let's assume standard logic: 1 vote = max pair points?
            // Wait, quad sort submits 4 votes?
            // But we only award points for ONE of them in `actions.ts`.
            // So max is one pair score.
            if (p.quad_scores) {
                const scores = Object.values(p.quad_scores).map(v => Number(v));
                maxPollPoints = Math.max(...scores);
            }
        } else {
            p.poll_objects.forEach(po => {
                console.log(`  - ${po.text}: ${po.points}`);
                if (po.points > maxPollPoints) maxPollPoints = po.points;
            });
        }
        console.log(`  > Max Points for Poll: ${maxPollPoints}`);
        totalMax += maxPollPoints;
    });

    console.log("----------------------");
    console.log(`TOTAL MAX POINTS: ${totalMax}`);
}

checkPoints();
