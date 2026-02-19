'use server';

import { getServiceRoleClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function deleteFeedback(id: string, attachmentPath?: string | null) {
    // 1. Init Service Role Client
    const supabase = getServiceRoleClient();

    try {
        // 2. Delete Attachment if exists
        if (attachmentPath) {
            console.log(`[deleteFeedback] Removing file: ${attachmentPath}`);
            const { error: storageError } = await supabase
                .storage
                .from('feedback_attachments')
                .remove([attachmentPath]);

            if (storageError) {
                console.error("Storage delete error (non-fatal):", storageError);
            }
        }

        // 3. Delete Record
        const { error: dbError } = await supabase
            .from('feedback')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        revalidatePath('/admin/feedback');
        return { success: true };

    } catch (error: any) {
        console.error("Delete feedback error:", error);
        return { error: error.message || "Failed to delete feedback" };
    }
}
