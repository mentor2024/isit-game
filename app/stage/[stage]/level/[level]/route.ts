import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ stage: string; level: string }> }
) {
    const { stage, level } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use Service Role to bypass potential RLS conflicts during update
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() { } } }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // If not logged in, we can't save progress. 
        // Redirect to login or just let them go to poll (but state won't be saved for future).
        // For now, redirect to login to ensure state persistence.
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const stageNum = parseInt(stage);
    const levelNum = parseInt(level);

    if (isNaN(stageNum) || isNaN(levelNum)) {
        return NextResponse.redirect(new URL("/poll", request.url));
    }

    // Use a fresh Service Client WITHOUT cookies to ensure we bypass RLS completely for the write operation.
    // The previous 'supabase' client had cookies, which might have carried RLS context or triggered user-scoped policies.
    const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const { error } = await adminSupabase
        .from('user_profiles')
        .update({
            current_stage: stageNum,
            current_level: levelNum
        })
        .eq('id', user.id);

    if (error) {
        console.error("[Route] Error updating profile level:", error);
        // Fallback: Redirect to poll anyway, but maybe log this better or show toast?
        // For now, proceeding is better than blocking.
    } else {
        console.log("[Route] Profile updated successfully");
    }

    // Redirect to Poll Page
    return NextResponse.redirect(new URL("/poll", request.url));
}
