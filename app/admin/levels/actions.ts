"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function saveLevelConfig(stage: number, level: number, formData: FormData) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const is_linked = formData.get("is_linked") === "on";
    const show_interstitial = formData.get("show_interstitial") === "on";

    const cleanHtml = (s: string) => {
        if (!s) return s;
        return s
            .replace(/&nbsp;/g, ' ')
            .replace(/\u00A0/g, ' ')
            .replace(/&amp;nbsp;/g, ' ')
            .replace(/&#160;/g, ' ');
    };

    const instructions = cleanHtml(formData.get("instructions") as string);
    const awareness_assessment = cleanHtml(formData.get("awareness_assessment") as string);

    // Build score_tiers — 5 tiers, looked up by letter
    const score_tiers = [];

    const tierDefs = [
        { letter: 'S', minKey: 'tier_s_min', msgKey: 'tier_s_message', defaultMin: 90, title: 'Supreme' },
        { letter: 'A', minKey: 'tier_a_min', msgKey: 'tier_a_message', defaultMin: 70, title: 'Aware' },
        { letter: 'B', minKey: 'tier_b_min', msgKey: 'tier_b_message', defaultMin: 50, title: 'Building' },
        { letter: 'C', minKey: 'tier_c_min', msgKey: 'tier_c_message', defaultMin: 25, title: 'Calibrating' },
        { letter: 'F', minKey: null,         msgKey: 'tier_f_message', defaultMin: 0,  title: 'Fallback' },
    ];

    for (const def of tierDefs) {
        const msg = formData.get(def.msgKey) as string;
        const min = def.minKey ? parseInt(formData.get(def.minKey) as string) || def.defaultMin : 0;
        score_tiers.push({
            tier: def.letter,
            min_score: min,
            message: cleanHtml(msg) || '',
            title: def.title,
        });
    }

    const pathSelectorConfigRaw = formData.get("path_selector_config") as string;
    const pathSelectorConfig = pathSelectorConfigRaw ? JSON.parse(pathSelectorConfigRaw) : {};
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
        revalidatePath(`/levelup`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
