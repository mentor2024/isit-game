import Link from "next/link";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";
import { ArrowLeft } from "lucide-react";
import LevelEditorForm from "./LevelEditorForm";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function AdminLevelEditor({
    params,
}: {
    params: Promise<{ stage: string; level: string }>
}) {
    const { stage, level } = await params;
    const stageNum = parseInt(stage);
    const levelNum = parseInt(level);

    // Formatters
    const stageName = STAGE_NAMES[stageNum - 1] || `Stage ${stageNum}`;
    const levelLetter = LEVEL_LETTERS[levelNum - 1] || `Level ${levelNum}`;

    // Fetch Config
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: config } = await supabase
        .from('level_configurations')
        .select('*')
        .eq('stage', stageNum)
        .eq('level', levelNum)
        .single();

    return (
        <div className="container mx-auto px-6 py-12 max-w-4xl">
            <Link
                href="/admin/levels"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-black font-bold mb-8 transition-colors"
            >
                <ArrowLeft size={20} />
                Back to Levels
            </Link>

            <header className="mb-12">
                <div className="flex items-center gap-4 mb-4">
                    <span className="px-3 py-1 bg-yellow-400 text-black font-bold rounded-lg uppercase tracking-wider text-sm">
                        Editing
                    </span>
                    <span className="text-gray-400 font-mono text-sm">
                        Stage {stage} / Level {level}
                    </span>
                </div>
                <h1 className="text-5xl font-black tracking-tight mb-4">
                    {stageName} • Level {levelLetter}
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl">
                    Configure the Level Up screen, bonuses, and completion logic for this level.
                </p>
            </header>

            <div className="bg-white rounded-3xl border-2 border-black p-12 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                <LevelEditorForm
                    stage={stageNum}
                    level={levelNum}
                    initialConfig={config || undefined}
                />
            </div>
        </div>
    );
}
