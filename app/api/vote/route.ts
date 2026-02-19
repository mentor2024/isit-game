import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

type Body = {
    pollId: string;
    isWordId: string;
    itWordId: string;
};

export async function POST(req: Request) {
    try {
        const { pollId, isWordId, itWordId } = (await req.json()) as Body;

        if (!pollId || !isWordId || !itWordId) {
            return NextResponse.json({ error: 'Missing pollId/isWordId/itWordId' }, { status: 400 });
        }

        const supabase = await getServerSupabase();

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase.rpc('vote_isit', {
            p_is_word_id: isWordId,
            p_it_word_id: itWordId,
            p_poll_id: pollId,
        });

        if (error) {
            console.error('RPC Error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // --- Level Up Check ---
        // 1. Get the poll we just voted on to know its Stage/Level
        const { data: currentPoll } = await supabase
            .from('polls')
            .select('stage, level')
            .eq('id', pollId)
            .single();

        if (currentPoll) {
            console.log(`[VoteAPI] Checking completion for Stage ${currentPoll.stage} Level ${currentPoll.level}`);

            // 2. Get ALL poll IDs in this level
            const { data: levelPolls } = await supabase
                .from('polls')
                .select('id')
                .eq('stage', currentPoll.stage)
                .eq('level', currentPoll.level);

            const allLevelPollIds = levelPolls?.map(p => p.id) || [];

            // 3. Get ALL user votes in this level (including the one just cast)
            // We need to fetch the votes again to be sure we have the latest state including the RPC insert
            if (allLevelPollIds.length > 0) {
                // Fetch votes for the user where poll_id is in the current level set
                const { data: userVotes } = await supabase
                    .from('poll_votes')
                    .select('poll_id')
                    .eq('user_id', user.id)
                    .in('poll_id', allLevelPollIds);

                const userVotedPollIds = userVotes?.map(v => v.poll_id) || [];

                console.log(`[VoteAPI] Total in Level: ${allLevelPollIds.length}, User Voted: ${userVotedPollIds.length}`);

                // 4. Check if every level poll has been voted on
                const hasCompletedLevel = allLevelPollIds.every(id => userVotedPollIds.includes(id));

                if (hasCompletedLevel) {
                    console.log(`[VoteAPI] Level Complete!`);
                    return NextResponse.json({
                        ok: true,
                        levelUp: true,
                        stage: currentPoll.stage,
                        level: currentPoll.level
                    });
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Vote Error:', e);
        return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
    }
}
