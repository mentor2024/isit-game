import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { createServerClient } from "@supabase/ssr";

async function getUser(id: string) {
    const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const { data: { user }, error: userError } = await serviceClient.auth.admin.getUserById(id);
    const { data: profile, error: profileError } = await serviceClient.from('user_profiles').select('*').eq('id', id).single();

    return { user, profile };
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
    const { user, profile } = await getUser(id);

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
