import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const cookieStore = await cookies()
        // Regular Client for Auth Exchange
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                        }
                    },
                },
            }
        )
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && session?.user) {
            const userId = session.user.id;

            // --- MERGE LOGIC START ---

            // 1. Check for Cookie-based Anon Progress (Stage 0)
            const anonProgressCookie = cookieStore.get('isit_anon_progress')?.value;
            if (anonProgressCookie) {
                try {
                    const votes = JSON.parse(anonProgressCookie);
                    if (votes.length > 0) {
                        // Use Service Role to insert votes securely
                        const serviceClient = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY!,
                            { auth: { persistSession: false } }
                        );

                        const votesToInsert = votes.map((v: any) => {
                            return {
                                poll_id: v.pollId,
                                user_id: userId,
                                is_correct: v.correct,
                                points_earned: v.points || 0,
                                selected_object_id: '00000000-0000-0000-0000-000000000000'
                            };
                        });

                        // Insert Votes
                        for (const v of votesToInsert) {
                            await serviceClient.from('poll_votes').upsert(v, { onConflict: 'user_id, poll_id, selected_object_id' }).select();
                        }

                        // Idempotent Score Update
                        const { data: allVotes } = await serviceClient
                            .from('poll_votes')
                            .select('points_earned')
                            .eq('user_id', userId);

                        const totalScore = allVotes?.reduce((sum, v) => sum + (v.points_earned || 0), 0) || 0;

                        await serviceClient
                            .from('user_profiles')
                            .update({ score: totalScore })
                            .eq('id', userId);
                    }
                } catch (e) {
                    console.error("[AuthCallback] Cookie merge error:", e);
                }
                // Clear Cookie
                cookieStore.set('isit_anon_progress', '', { maxAge: 0 });
            }

            // 2. Check for Previous Anon User ID (DB-based Merge)
            const prevAnonId = cookieStore.get('prev_anon_id')?.value;

            if (prevAnonId && prevAnonId !== userId) {
                const serviceClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    { auth: { persistSession: false } }
                );

                // A. Transfer Votes
                const { error: voteError } = await serviceClient
                    .from('poll_votes')
                    .update({ user_id: userId })
                    .eq('user_id', prevAnonId);

                if (voteError) console.error("[AuthCallback] Vote transfer error:", voteError);

                // B. Transfer Score
                const { data: oldProfile } = await serviceClient.from('user_profiles').select('score').eq('id', prevAnonId).single();

                if (oldProfile && oldProfile.score > 0) {
                    const { data: newProfile } = await serviceClient.from('user_profiles').select('score').eq('id', userId).single();
                    const newScore = (newProfile?.score || 0) + oldProfile.score;

                    await serviceClient.from('user_profiles').update({ score: newScore }).eq('id', userId);

                    // Zero out old
                    await serviceClient.from('user_profiles').update({ score: 0 }).eq('id', prevAnonId);
                }

                // C. CLEANUP - Force Delete

                // 1. Delete Profile Row
                const { error: profileDeleteError } = await serviceClient.from('user_profiles').delete().eq('id', prevAnonId);
                if (profileDeleteError) console.error(`[AuthCallback] Profile delete error:`, profileDeleteError);

                // 2. Delete Auth User
                const { error: deleteError } = await serviceClient.auth.admin.deleteUser(prevAnonId);
                if (deleteError) {
                    console.error(`[AuthCallback] Failed to delete old anon user ${prevAnonId}:`, deleteError);
                }

                // Clear Cookie
                cookieStore.set('prev_anon_id', '', { maxAge: 0 });
            }

            // 3. AUTO-ADVANCE LOGIC (Fix for "Returned to Assessment")
            // If the user is at Stage 0 (default) and we just merged votes (or they had them), 
            // and their score justifies it, move them to Stage 1.
            const serviceClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                { auth: { persistSession: false } }
            );

            const { data: userProfile } = await serviceClient
                .from('user_profiles')
                .select('current_stage, score')
                .eq('id', userId)
                .single();

            // If user is stuck in Stage 0 but has points, advance them to Stage 1 Level 1
            if (userProfile && userProfile.current_stage === 0 && userProfile.score > 0) {
                await serviceClient
                    .from('user_profiles')
                    .update({ current_stage: 1, current_level: 1 })
                    .eq('id', userId);
                console.log(`[AuthCallback] Auto-advanced User ${userId} to Stage 1`);
            }

            // --- MERGE LOGIC END ---

            // Check for cookie redirect fallback
            const cookieRedirect = cookieStore.get('auth_redirect')?.value;
            let finalRedirect = next;

            if (next === '/' && cookieRedirect) {
                finalRedirect = cookieRedirect;
                // Clear the cookie so it doesn't persist
                cookieStore.set('auth_redirect', '', { maxAge: 0 });
            }

            // Successful login -> Redirect to the 'next' URL (dashboard or level)
            return NextResponse.redirect(`${origin}${finalRedirect}`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
