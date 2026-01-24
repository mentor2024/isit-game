import { getServerSupabase } from "@/lib/supabaseServer";
import VotingInterface from "@/components/VotingInterface";

export default async function PollPage() {
    const supabase = await getServerSupabase();

    // Fetch the first poll and its objects
    const { data: polls, error: pollError } = await supabase
        .from("polls")
        .select("*, poll_objects(*)")
        .limit(1)
        .single();

    if (pollError || !polls) {
        return (
            <div className="p-8 text-center text-red-500">
                Error loading poll: {pollError?.message || "No poll found"}
            </div>
        );
    }

    // Sort objects by their ID to ensure consistent left/right (L/R)
    const objects = polls.poll_objects.sort((a: any, b: any) =>
        a.id.localeCompare(b.id)
    );

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative">
            <main className="max-w-xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-8 text-center border-b border-gray-100">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{polls.title}</h1>
                    <p className="text-gray-600">{polls.instructions}</p>
                </div>

                <VotingInterface pollId={polls.id} objects={objects} />

                <div className="p-4 bg-gray-50 text-center text-sm text-gray-400">
                    Poll ID: {polls.id}
                </div>
            </main>
        </div>
    );
}
