import Link from "next/link";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";
import { ArrowLeft } from "lucide-react";
import LevelEditorForm from "./LevelEditorForm";
import { getServerSupabase } from "@/lib/supabaseServer";

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
    const supabase = await getServerSupabase();

    const { data: config } = await supabase
        .from('level_configurations')
        .select('*')
        .eq('stage', stageNum)
        .eq('level', levelNum)
        .single();

    const { count: pollCount } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('stage', stageNum)
        .eq('level', levelNum);

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
                    <a
                        href={`/levelup?stage=${stage}&level=${level}`}
                        target="_blank"
                        className="ml-auto flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
                    >
                        <span>Inspect</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
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
                    pollCount={pollCount || 0}
                />
            </div>
        </div>
    );
}
