"use server";

import { revalidatePath } from "next/cache";
import { getServiceRoleClient } from "@/lib/supabaseServer";

export async function saveLevelConfig(stage: number, level: number, formData: FormData) {
    const supabase = getServiceRoleClient();

    const is_linked = formData.get("is_linked") === "on";
    const show_interstitial = formData.get("show_interstitial") === "on";

    // Helper to clean HTML (Remove &nbsp; to prevent layout breaking)
    // Enhanced to catch &nbsp; and encoded variations
    const cleanHtml = (s: string) => {
        if (!s) return s;
        // console.log(`[saveLevelConfig] Raw size: ${s.length}, First 50: ${s.substring(0, 50)}`);
        // Replace: &nbsp;, \u00A0, &amp;nbsp;, &#160;
        const cleaned = s
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/&amp;nbsp;/g, ' ')
            .replace(/&#160;/g, ' ');
        // console.log(`[saveLevelConfig] Cleaned size: ${cleaned.length}`);
        return cleaned;
    };

    const instructions = cleanHtml(formData.get("instructions") as string);
    const awareness_assessment = cleanHtml(formData.get("awareness_assessment") as string);

    // Parse Score Tiers
    const score_tiers = [];
    if (formData.get("tier_a_min")) {
        score_tiers.push({
            min_score: parseInt(formData.get("tier_a_min") as string),
            message: cleanHtml(formData.get("tier_a_message") as string),
            tier: 'A',
            title: 'Outstanding!'
        });
    }
    if (formData.get("tier_b_min")) {
        score_tiers.push({
            min_score: parseInt(formData.get("tier_b_min") as string),
            message: cleanHtml(formData.get("tier_b_message") as string),
            tier: 'B',
            title: 'Good Effort'
        });
    }
    // Tier C is implicit fallback (min 0) but we can store message
    if (formData.get("tier_c_message")) {
        score_tiers.push({
            min_score: 0,
            message: cleanHtml(formData.get("tier_c_message") as string),
            tier: 'C',
            title: 'Keep Practicing'
        });
    }

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
                show_interstitial,
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
