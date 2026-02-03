
'use server';

import { getServerSupabase } from "@/lib/supabaseServer";

export async function submitFeedback(formData: FormData) {
    const supabase = await getServerSupabase();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const feedbackType = formData.get('feedback_type') as string;
    const feedbackText = formData.get('feedback') as string;
    const file = formData.get('file') as File | null;
    const contextRaw = formData.get('context') as string | null;

    if (!feedbackType || !feedbackText) {
        return { error: 'Missing required fields' };
    }

    let context = null;
    if (contextRaw) {
        try {
            context = JSON.parse(contextRaw);
        } catch (e) {
            console.error("Error parsing feedback context:", e);
        }
    }

    let attachmentUrl = null;

    if (file && file.size > 0) {
        // Validation
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

        if (file.size > MAX_SIZE) {
            return { error: 'File size exceeds 5MB limit.' };
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return { error: 'Invalid file type. Only Images and PDFs are allowed.' };
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id || 'anon'}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase
            .storage
            .from('feedback_attachments')
            .upload(fileName, file);

        if (uploadError) {
            console.error('File Upload Error:', uploadError);
            return { error: 'Failed to upload file. Please try again.' };
        }

        // For private buckets, we usually store the path. 
        // Or if we want a signed URL later, path is fine.
        attachmentUrl = uploadData?.path;
    }

    const { error } = await supabase
        .from('feedback')
        .insert({
            user_id: user?.id || null,
            feedback_type: feedbackType,
            feedback: feedbackText,
            attachment_url: attachmentUrl,
            context: context
        });

    if (error) {
        console.error('Feedback Submission Error:', error);
        return { error: error.message };
    }

    return { success: true };
}
