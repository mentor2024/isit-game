"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Check role helper (duplicated from other actions, ideally shared but keeping self-contained for now)
async function checkRole() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            }
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role;
}

export async function updateStageConfig(formData: FormData) {
    const role = await checkRole();
    if (role !== 'admin' && role !== 'superadmin') {
        throw new Error("Unauthorized");
    }

    const stage = parseInt(formData.get("stage") as string);
    const completion_bonus = parseInt(formData.get("completion_bonus") as string);

    if (isNaN(stage) || isNaN(completion_bonus)) {
        throw new Error("Invalid input");
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const { error } = await supabase
        .from('stage_configurations')
        .upsert({
            stage,
            completion_bonus,
            updated_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error("Error updating stage config:", error);
        throw new Error(error.message);
    }

    revalidatePath(`/admin/stages`);
    revalidatePath(`/admin/stages/${stage}`);
    redirect(`/admin/stages`);
}
