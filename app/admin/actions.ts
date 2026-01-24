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

export async function updateUserRole(formData: FormData) {
    const targetUserId = formData.get("userId") as string;
    const newRole = formData.get("newRole") as string;
    const currentUserRole = await checkRole();

    if (currentUserRole !== 'superadmin') {
        throw new Error("Only Superadmins can change roles");
    }

    const supabaseAdmin = createServiceRoleClient();

    const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);

    if (error) {
        console.error("Update role error:", error);
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

    // Update the role immediately after creation
    if (data.user && role !== 'user') {
        const { error: roleError } = await supabaseAdmin
            .from('user_profiles')
            .update({ role: role })
            .eq('id', data.user.id);

        if (roleError) console.error("Error setting role:", roleError);
    }

    revalidatePath("/admin");
}
