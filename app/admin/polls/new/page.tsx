import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CreatePollForm from "@/components/CreatePollForm";
import { getServerSupabase } from "@/lib/supabaseServer";

async function getLastPoll() {
    const supabase = await getServerSupabase();

    const { data: polls } = await supabase
        .from('polls')
        .select('stage, level, poll_order, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    return polls?.[0];
}

export default async function NewPollPage() {
    const lastPoll = await getLastPoll();

    // Default values logic
    const defaultStage = lastPoll?.stage || 1;
    const defaultLevel = lastPoll?.level || 1;

    // Increment order, but cap at 20. If 20, cycle back to 1 (maybe? or just stay 20)
    // User requested "next number".
    let defaultOrder = (lastPoll?.poll_order || 0) + 1;
    if (defaultOrder > 20) defaultOrder = 20;

    return (
        <div className="max-w-3xl mx-auto p-8">
            <Link href="/admin/polls" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Polls
            </Link>

            <h1 className="text-4xl font-black mb-8">Create New Poll</h1>

            <CreatePollForm
                defaultValues={{
                    stage: defaultStage,
                    level: defaultLevel,
                    poll_order: defaultOrder
                }}
            />
        </div>
    );
}
