import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ stage: string; level: string }> }
) {
    const { stage, level } = await params;
    // Note: We use user-context client here only for auth check, then service role for the write.
    const supabase = await getServerSupabase();

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

    const adminSupabase = getServiceRoleClient();

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
