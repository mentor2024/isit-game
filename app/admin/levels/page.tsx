import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";
import { Edit } from "lucide-react";

export default async function AdminLevelsPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    // Fetch all polls to aggregate stages/levels
    const { data: polls } = await supabase
        .from('polls')
        .select('stage, level, id')
        .order('stage', { ascending: true })
        .order('level', { ascending: true });

    // Aggregation Logic
    type LevelInfo = { stage: number; level: number; pollCount: number };
    const levelsMap = new Map<string, LevelInfo>();

    polls?.forEach(p => {
        const stage = p.stage !== undefined && p.stage !== null ? p.stage : 1;
        const level = p.level || 1;
        const key = `${stage}-${level}`;

        if (!levelsMap.has(key)) {
            levelsMap.set(key, { stage, level, pollCount: 0 });
        }

        const info = levelsMap.get(key)!;
        info.pollCount++;
    });

    // Convert map to array and sort
    const distinctLevels = Array.from(levelsMap.values()).sort((a, b) => {
        if (a.stage !== b.stage) return a.stage - b.stage;
        return a.level - b.level;
    });

    return (
        <div className="max-w-6xl mx-auto p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black">Levels</h1>
                    <p className="text-gray-500 mt-2">Manage level configurations and interstitials.</p>
                </div>
            </header>

            <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-black">
                            <th className="p-4 font-bold">Stage Identifier</th>
                            <th className="p-4 font-bold">Level Identifier</th>
                            <th className="p-4 font-bold text-center">Poll Count</th>
                            <th className="p-4 font-bold">Game Name</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distinctLevels.map((lvl) => {
                            const stageName = lvl.stage === 0 ? "Screen" : (STAGE_NAMES[lvl.stage - 1] || `Stage ${lvl.stage}`);
                            const levelLetter = LEVEL_LETTERS[lvl.level - 1] || `Level ${lvl.level}`;
                            const displayName = `${stageName} • Level ${levelLetter}`;

                            return (
                                <tr key={`${lvl.stage}-${lvl.level}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold">
                                        <span className="bg-black text-white px-3 py-1 rounded-md text-sm">Stage {lvl.stage}</span>
                                    </td>
                                    <td className="p-4 font-bold">
                                        <span className="bg-gray-200 text-black px-3 py-1 rounded-md text-sm">Level {lvl.level}</span>
                                    </td>
                                    <td className="p-4 text-center font-mono text-gray-500">
                                        {lvl.pollCount}
                                    </td>
                                    <td className="p-4 font-bold text-lg text-gray-800">
                                        {displayName}
                                    </td>
                                    <td className="p-4 flex justify-end">
                                        <Link
                                            href={`/admin/levels/${lvl.stage}/${lvl.level}`}
                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 font-bold"
                                            title="Edit Level Settings"
                                        >
                                            <Edit size={18} />
                                            Configure
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}

                        {distinctLevels.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-400">
                                    <p className="text-xl font-bold mb-2">No Levels Found</p>
                                    <p className="text-sm">Create polls with assigned stages/levels to populate this list.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
