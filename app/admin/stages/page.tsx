import Link from "next/link";
import { STAGE_NAMES } from "@/lib/formatters";
import { Edit } from "lucide-react";
import { getServerSupabase } from "@/lib/supabaseServer";

export default async function AdminStagesPage() {
    const supabase = await getServerSupabase();

    // Fetch existing configurations
    const { data: configs } = await supabase
        .from('stage_configurations')
        .select('*');

    const configMap = new Map(configs?.map(c => [c.stage, c]));

    // We know there are stages 1-5 currently defined in STAGE_NAMES, plus potentially more dynamically.
    // For now, let's list the ones we know exist based on Polls + STAGE_NAMES.
    // Actually, listing 1-5 hardcoded or based on STAGE_NAMES is safest.

    // Let's assume stages 1 to 5 for now as a baseline, or fetch distinct stages from polls.
    // Fetching distinct stages from polls is better to avoid showing empty future stages.

    const { data: polls } = await supabase
        .from('polls')
        .select('stage')
        .order('stage', { ascending: true });

    const distinctStages = Array.from(new Set(polls?.map(p => p.stage) || [])).sort((a, b) => a - b);

    // Ensure we at least show Stage 1 if no polls exist
    if (distinctStages.length === 0) distinctStages.push(1);

    return (
        <div className="max-w-6xl mx-auto p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black">Stages</h1>
                    <p className="text-gray-500 mt-2">Manage stage completion bonuses and settings.</p>
                </div>
            </header>

            <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-black">
                            <th className="p-4 font-bold">Stage Name</th>
                            <th className="p-4 font-bold text-center">Completion Bonus</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {distinctStages.map((stageNum) => {
                            const config = configMap.get(stageNum);
                            const bonus = config?.completion_bonus || 0;
                            const stageName = STAGE_NAMES[stageNum - 1] || `Stage ${stageNum}`;

                            return (
                                <tr key={stageNum} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-lg">
                                        {stageName}
                                        <span className="ml-2 text-sm text-gray-400 font-normal">(Stage {stageNum})</span>
                                    </td>
                                    <td className="p-4 text-center font-mono text-gray-500">
                                        <span className={`px-3 py-1 rounded-full ${bonus > 0 ? "bg-green-100 text-green-800" : "bg-gray-100"}`}>
                                            +{bonus} pts
                                        </span>
                                    </td>
                                    <td className="p-4 flex justify-end">
                                        <Link
                                            href={`/admin/stages/${stageNum}`}
                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 font-bold"
                                        >
                                            <Edit size={18} />
                                            Configure
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
