import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { getServiceRoleClient } from "@/lib/supabaseServer";

async function getUser(id: string) {
    const serviceClient = getServiceRoleClient();

    const { data: { user }, error: userError } = await serviceClient.auth.admin.getUserById(id);
    const { data: profile, error: profileError } = await serviceClient.from('user_profiles').select('*').eq('id', id).single();

    const { data: rawPollHistory } = await serviceClient
        .from('poll_votes')
        .select(`
            *,
            polls (
                id,
                title,
                stage,
                level,
                poll_order
            )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

    // Group votes by Poll ID to handle Quad Polls (4 rows) and IS/IT (2 rows)
    const groupedHistory = new Map();

    rawPollHistory?.forEach((vote: any) => {
        if (!vote.polls) return; // Skip if poll deleted or missing

        const pollId = vote.poll_id;
        if (!groupedHistory.has(pollId)) {
            groupedHistory.set(pollId, {
                id: vote.id, // Use first vote ID as key
                created_at: vote.created_at,
                polls: vote.polls,
                is_correct: vote.is_correct, // Will be updated if mixed
                points_earned: 0,
                vote_count: 0
            });
        }

        const group = groupedHistory.get(pollId);
        group.points_earned += (vote.points_earned || 0);
        group.vote_count += 1;

        // If any vote in the group is marked incorrect, is the whole poll incorrect?
        // For Quad: all rows usually share same is_correct.
        // For IS/IT: Need both correct?
        // Let's assume if points > 0, it's correct-ish, or trust the is_correct flag if consistent.
        // If we see explicit 'false', mark group as false?
        // Ideally rely on points for "Partial" credit if valid, but for now:
        if (vote.is_correct === false) group.is_correct = false;
    });

    const pollHistory = Array.from(groupedHistory.values());

    return { user, profile, pollHistory };
}

export default async function UserDetailsPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ message?: string, error?: string }>
}) {
    const { id } = await params;
    const { message, error } = await searchParams;
    const { user, profile, pollHistory } = await getUser(id);

    if (!user) return <div className="p-8">User not found</div>;

    const role = profile?.role || 'user';

    return (
        <div className="max-w-2xl mx-auto p-8">
            <Link href="/admin/users" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Users
            </Link>

            {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 font-bold animate-pulse">
                    <span>✅</span>
                    {message}
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 font-bold">
                    {error}
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black">User Details</h1>
                <Link href={`/admin/users/${id}/edit`} className="bg-black text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                    <Edit size={20} />
                    Edit
                </Link>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black flex flex-col gap-6">

                <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                    <div className="shrink-0">
                        {profile?.avatar_image ? (
                            <img
                                src={profile.avatar_image}
                                alt={profile.avatar_name || "User Avatar"}
                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 font-bold text-4xl border-4 border-gray-50">
                                ?
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Username</label>
                        <div className="text-3xl font-black text-gray-900 mt-1">
                            {profile?.avatar_name || <span className="text-gray-300 italic">No username set</span>}
                        </div>
                    </div>
                </div>

                <div className="pb-6 border-b border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                    <div className="text-2xl font-bold">{user.email}</div>
                </div>

                <div className="pb-6 border-b border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Role</label>
                    <div className="mt-1">
                        <span className={`px-3 py-1 rounded text-sm font-bold uppercase ${role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                            role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {role}
                        </span>
                    </div>
                </div>

                <div className="pb-6 border-b border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Score</label>
                    <div className="text-xl font-bold text-yellow-600 flex items-center gap-2">
                        <span>⭐️</span> {profile?.score || 0}
                    </div>
                </div>

                <div className="pb-6 border-b border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">User ID</label>
                    <div className="font-mono bg-gray-50 p-3 rounded-lg mt-1 text-sm border border-gray-200">
                        {user.id}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Created At</label>
                    <div className="font-medium text-lg">
                        {new Date(user.created_at).toLocaleString()}
                    </div>
                </div>

            </div>

            {/* Poll History */}
            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Poll History</h3>
                <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-black">
                                    <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">Date</th>
                                    <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">Context</th>
                                    <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 w-full">Poll</th>
                                    <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap text-center">Result</th>
                                    <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pollHistory?.map((vote: any) => (
                                    <tr key={vote.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                            {new Date(vote.created_at).toLocaleDateString()}
                                            <span className="text-xs text-gray-400 block">{new Date(vote.created_at).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-xs font-mono text-gray-500">
                                            {vote.polls ? (
                                                <div className="flex flex-col">
                                                    <span>S{vote.polls.stage} / L{vote.polls.level}</span>
                                                    <span>Poll #{vote.polls.poll_order}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-sm font-bold">
                                            {vote.polls ? (
                                                <a
                                                    href={`/admin/polls/${vote.polls.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-black hover:text-blue-600 hover:underline group flex items-center gap-1"
                                                >
                                                    {vote.polls.title}
                                                </a>
                                            ) : <span className="text-gray-400 italic">Poll Deleted</span>}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-center">
                                            {vote.is_correct ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                                                    Correct
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                                                    Incorrect
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-right font-mono font-bold text-gray-900">
                                            {vote.points_earned > 0 ? `+${vote.points_earned}` : vote.points_earned}
                                        </td>
                                    </tr>
                                ))}
                                {(!pollHistory || pollHistory.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">
                                            No polls taken yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h3>

                <div className="flex gap-4">
                    <form action={async (formData) => {
                        "use server";
                        const { resetUserProgress } = await import("../../actions");
                        await resetUserProgress(formData);
                    }}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                            className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-full font-bold hover:bg-red-100 hover:scale-105 transition-transform"
                        >
                            Reset Progress (Votes & Score)
                        </button>
                    </form>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    This will delete all votes and reset the score to 0. This cannot be undone.
                </p>
            </div>

        </div>
    );
}
