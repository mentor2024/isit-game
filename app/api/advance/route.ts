import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const stageStr = searchParams.get('stage');
    const levelStr = searchParams.get('level');

    if (!stageStr || !levelStr) {
        return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const stage = parseInt(stageStr);
    const level = parseInt(levelStr);

    if (isNaN(stage) || isNaN(level)) {
        return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const supabase = await getServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Logged In: Update Profile
        const serviceClient = getServiceRoleClient();

        await serviceClient.from('user_profiles').update({
            current_stage: stage,
            current_level: level
        }).eq('id', user.id);
    } else {
        // Anonymous: Set Cookie State
        // We use a new cookie 'isit_anon_state' to track stage/level
        const oldState = cookieStore.get('isit_anon_state')?.value;
        const newState = { stage, level, timestamp: Date.now() };

        // Only set cookie on next response - but we are redirecting.
        // Middleware handles cookies? No, Route Handlers can set cookies via response.

        cookieStore.set('isit_anon_state', JSON.stringify(newState), {
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 Days
        });
    }

    // Redirect to Poll Page (which will now read the new state)
    redirect('/poll');
}
