"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";

async function checkRole() {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const serviceClient = getServiceRoleClient();
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

    const supabase = getServiceRoleClient();

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
