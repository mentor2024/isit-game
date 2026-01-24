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

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Vote Error:', e);
        return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
    }
}
