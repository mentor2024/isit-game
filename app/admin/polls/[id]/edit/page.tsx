import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EditPollForm from "@/components/EditPollForm";
import { getServiceRoleClient } from "@/lib/supabaseServer";

async function getPoll(id: string) {
    const adminClient = getServiceRoleClient();
    const { data: poll } = await adminClient.from('polls').select('*, poll_objects(*)').eq('id', id).single();
    return poll;
}

export default async function EditPollPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const poll = await getPoll(id);
    console.log(`[EditPollPage] Loaded Poll ${id}: Stage =`, poll?.stage, typeof poll?.stage);

    if (!poll) return <div className="p-8">Poll not found</div>;

    // Fetch vote count to determine if objects can be edited
    const adminClient = getServiceRoleClient();
    const { count: voteCount } = await adminClient.from('poll_votes').select('*', { count: 'exact', head: true }).eq('poll_id', id);

    return (
        <div className="max-w-2xl mx-auto p-8">
            <Link href="/admin/polls" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Polls
            </Link>

            <h1 className="text-4xl font-black mb-8">Edit Poll</h1>

            <EditPollForm poll={poll} voteCount={voteCount || 0} />
        </div>
    );
}
