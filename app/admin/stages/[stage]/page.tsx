import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STAGE_NAMES } from "@/lib/formatters";
import { updateStageConfig } from "@/app/admin/stages/actions";
import { getServerSupabase } from "@/lib/supabaseServer";

export default async function EditStagePage({ params }: { params: Promise<{ stage: string }> }) {
    const { stage } = await params;
    const stageNum = parseInt(stage);

    const supabase = await getServerSupabase();

    const { data: config } = await supabase
        .from('stage_configurations')
        .select('*')
        .eq('stage', stageNum)
        .single();

    const stageName = STAGE_NAMES[stageNum - 1] || `Stage ${stageNum}`;
    const bonus = config?.completion_bonus || 0;

    return (
        <div className="max-w-3xl mx-auto p-8">
            <Link href="/admin/stages" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Stages
            </Link>

            <header className="mb-8">
                <h1 className="text-4xl font-black mb-2">{stageName}</h1>
                <p className="text-gray-500">Configure settings for Stage {stageNum}.</p>
            </header>

            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black">
                <form action={updateStageConfig} className="flex flex-col gap-6">
                    <input type="hidden" name="stage" value={stageNum} />

                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-lg">Stage Completion Bonus (Points)</label>
                        <p className="text-sm text-gray-500 mb-2">Awarded to users when they complete the final level of this stage.</p>
                        <input
                            name="completion_bonus"
                            type="number"
                            defaultValue={bonus}
                            min="0"
                            step="50"
                            className="border-2 border-black p-4 rounded-xl text-xl font-mono w-full"
                        />
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>

                    <button
                        type="submit"
                        className="bg-black text-white py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-lg"
                    >
                        Save Configuration
                    </button>
                </form>
            </div>
        </div>
    );
}
