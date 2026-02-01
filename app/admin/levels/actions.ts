"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function saveLevelConfig(stage: number, level: number, formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use Service Role to ensure permission (Admin check done in Page/Middleware)
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const is_linked = formData.get("is_linked") === "on";

    // Helper to clean HTML (Remove &nbsp; to prevent layout breaking)
    // Enhanced to catch &nbsp; and encoded variations
    const cleanHtml = (s: string) => {
        if (!s) return s;
        console.log(`[saveLevelConfig] Raw size: ${s.length}, First 50: ${s.substring(0, 50)}`);
        const cleaned = s.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ').replace(/&amp;nbsp;/g, ' ');
        console.log(`[saveLevelConfig] Cleaned size: ${cleaned.length}`);
        return cleaned;
    };

    const instructions = cleanHtml(formData.get("instructions") as string);
    const awareness_assessment = cleanHtml(formData.get("awareness_assessment") as string);

    // Parse Score Tiers (Group A, B, C)
    const tier_a_min = parseInt(formData.get("tier_a_min") as string) || 25;
    const tier_a_msg = cleanHtml(formData.get("tier_a_message") as string);
    const tier_b_min = parseInt(formData.get("tier_b_min") as string) || 15;
    const tier_b_msg = cleanHtml(formData.get("tier_b_message") as string);
    const tier_c_msg = cleanHtml(formData.get("tier_c_message") as string);

    const score_tiers = [
        { min_score: tier_a_min, message: tier_a_msg },
        { min_score: tier_b_min, message: tier_b_msg },
        { min_score: 0, message: tier_c_msg }
    ];

    const pathSelectorConfigRaw = formData.get("path_selector_config") as string;
    const pathSelectorConfig = pathSelectorConfigRaw ? JSON.parse(pathSelectorConfigRaw) : {};

    // Parse modules from checkboxes
    // getAll('modules') returns array of values for checked boxes
    const modules = formData.getAll("modules");

    try {
        const { error } = await supabase
            .from('level_configurations')
            .upsert({
                stage,
                level,
                instructions,
                awareness_assessment,
                is_linked,
                score_tiers,
                enabled_modules: modules,
                path_selector_config: pathSelectorConfig,
                updated_at: new Date().toISOString()
            }, { onConflict: 'stage, level' });

        if (error) {
            console.error("Error saving level config:", error);
            return { success: false, error: error.message };
        }

        revalidatePath(`/admin/levels/${stage}/${level}`);
        revalidatePath(`/levelup`); // Revalidate the user facing page too

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
