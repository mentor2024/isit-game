"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabaseServer";

export type DiscussionComment = {
    id: string;
    poll_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    created_at: string;
    user_profiles: {
        avatar_name: string | null;
        avatar_image: string | null;
        role: string | null;
    } | null;
    children?: DiscussionComment[]; // For client-side nesting
};

export async function getComments(pollId: string): Promise<DiscussionComment[]> {
    const supabase = await getServerSupabase();

    const { data, error } = await supabase
        .from('comments')
        .select(`
            id,
            poll_id,
            user_id,
            parent_id,
            content,
            created_at,
            user_profiles (
                avatar_name,
                avatar_image,
                role
            )
        `)
        .eq('poll_id', pollId)
        .order('created_at', { ascending: true }); // Chronological

    if (error) {
        console.error("Error fetching comments:", error);
        return [];
    }

    // Cast the user_profiles properly if needed, but Supabase types are usually okay.
    return data as any as DiscussionComment[];
}

export async function postComment(pollId: string, content: string, parentId?: string) {
    const supabase = await getServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Must be logged in to comment." };

    if (!content || content.trim().length === 0) return { success: false, error: "Comment cannot be empty." };

    const { error } = await supabase
        .from('comments')
        .insert({
            poll_id: pollId,
            user_id: user.id,
            parent_id: parentId || null,
            content: content.trim()
        });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/poll`); // Revalidate poll pages
    revalidatePath(`/polls/[id]`); // Also revalidate specifically if needed?
    return { success: true };
}

export async function deleteComment(commentId: string) {
    const supabase = await getServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // RLS handles this too, but explicit check is good.

    if (error) return { success: false, error: error.message };

    revalidatePath(`/poll`);
    return { success: true };
}
