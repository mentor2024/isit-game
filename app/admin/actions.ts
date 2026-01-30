"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Client for checking current user's role (Standard Auth)
async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );
}

// Client for Admin Operations (Service Role - Bypasses RLS)
function createServiceRoleClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() { return [] },
                setAll() { }
            }
        }
    );
}

// Helper to check permissions
async function checkRole() {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Use Service Role to bypass RLS for role check
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role; // 'superadmin' | 'admin' | 'user'
}

export async function deleteUser(formData: FormData) {
    const targetUserId = formData.get("userId") as string;
    const currentUserRole = await checkRole();

    if (currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
        throw new Error("Unauthorized");
    }

    const supabaseAdmin = createServiceRoleClient();

    // Safety check: Admin cannot delete Superadmin (needs more complex logic, but basic check:)
    // Fetch target user role first
    const { data: targetProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', targetUserId)
        .single();

    if (targetProfile?.role === 'superadmin') {
        throw new Error("Cannot delete a Superadmin");
    }

    if (currentUserRole === 'admin' && targetProfile?.role === 'admin') {
        throw new Error("Admins cannot delete other Admins");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (error) {
        console.error("Delete user error:", error);
        redirect(`/admin?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/admin");
}

export async function updateUser(formData: FormData) {
    const targetUserId = formData.get("userId") as string;
    const newRole = formData.get("newRole") as string;
    const avatarName = formData.get("avatar_name") as string;
    const avatarImage = formData.get("avatar_image") as string;

    const currentUserRole = await checkRole();

    // Permissions: 
    // Superadmin: Can edit anything.
    // Admin: Can edit 'user' roles (but maybe restricted from changing roles? For now let's assume loose check or re-implement strict check)

    if (currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
        throw new Error("Unauthorized");
    }

    const supabaseAdmin = createServiceRoleClient();

    const updates: any = {};
    if (newRole) {
        if (currentUserRole !== 'superadmin') {
            // Basic protection: Admin cannot promote to Superadmin
            if (newRole === 'superadmin') throw new Error("Admins cannot promote to Superadmin");
        }
        updates.role = newRole;
    }
    if (avatarName !== null) updates.avatar_name = avatarName;
    if (avatarImage !== null) updates.avatar_image = avatarImage;

    const { error } = await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('id', targetUserId);

    if (error) {
        console.error("Update profile error:", error);
        redirect(`/admin?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/admin");
}

export async function createUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const currentUserRole = await checkRole();

    if (currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
        throw new Error("Unauthorized");
    }

    if (currentUserRole === 'admin' && (role === 'admin' || role === 'superadmin')) {
        throw new Error("Admins can only create Users");
    }

    const supabaseAdmin = createServiceRoleClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        console.error("Create user error:", error);
        redirect(`/admin?error=${encodeURIComponent(error.message)}`);
    }

    // Update profile
    const updates: any = { role: role };
    const avatarName = formData.get("avatar_name") as string;
    const avatarImage = formData.get("avatar_image") as string;

    if (avatarName) updates.avatar_name = avatarName;
    if (avatarImage) updates.avatar_image = avatarImage;

    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('id', data.user.id);

    if (profileError) console.error("Error setting profile:", profileError);

    revalidatePath("/admin");
}

export async function resetUserProgress(formData: FormData) {
    const targetUserId = formData.get("userId") as string;
    const currentUserRole = await checkRole();

    if (currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
        throw new Error("Unauthorized");
    }

    const supabaseAdmin = createServiceRoleClient();

    // 1. Delete all votes
    const { error: deleteError } = await supabaseAdmin
        .from('poll_votes')
        .delete()
        .eq('user_id', targetUserId);

    if (deleteError) {
        console.error("Reset progress error (votes):", deleteError);
        redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent(deleteError.message)}`);
    }

    // 2. Reset Score to 0
    const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
            score: 0,
            current_stage: 0, // Reset to Stage 0 (Introduction)
            current_level: 1
        })
        .eq('id', targetUserId);

    if (updateError) {
        console.error("Reset progress error (score):", updateError);
        redirect(`/admin/users/${targetUserId}?error=${encodeURIComponent(updateError.message)}`);
    }

    // revalidatePath(`/admin/users/${targetUserId}`);
    redirect(`/admin/users/${targetUserId}?message=User%20progress%20has%20been%20fully%20reset.`);
}
