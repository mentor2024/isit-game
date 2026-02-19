import Link from "next/link";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { deleteUser } from "../actions";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

async function getUsers(user: any) {
    const serviceClient = getServiceRoleClient();

    const [usersRes, profilesRes] = await Promise.all([
        serviceClient.auth.admin.listUsers(),
        serviceClient.from('user_profiles').select('*')
    ]);

    const users = usersRes.data.users || [];
    const profiles = profilesRes.data || [];
    const roleMap = new Map(profiles.map(p => [p.id, p.role]));

    const currentUserProfile = profiles.find(p => p.id === user.id);
    const currentUserRole = currentUserProfile?.role || 'user';

    return { users, profiles, roleMap, currentUserRole, error: usersRes.error };
}

export default async function AdminUsersPage() {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Unauthorized</div>;

    const { users, profiles, roleMap, currentUserRole, error } = await getUsers(user);

    // Fetch Last Poll Data for all users
    // Note: This does N queries (where N = users count).
    // Determine last poll for each user
    const userLastPolls = await Promise.all(users.map(async (u) => {
        const serviceClient = getServiceRoleClient();

        const { data: lastVotes } = await serviceClient
            .from('poll_votes')
            .select('created_at, polls(title, stage, level)')
            .eq('user_id', u.id)
            .order('created_at', { ascending: false })
            .limit(1);

        const lastVote = lastVotes && lastVotes.length > 0 ? lastVotes[0] : null;
        return { userId: u.id, lastVote };
    }));

    // Create a map for quick lookup
    const lastPollMap = new Map(userLastPolls.map(i => [i.userId, i.lastVote]));

    if (error) return <div>Error loading users: {error.message}</div>;

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black">Users</h1>
                <Link href="/admin/users/new" className="bg-black text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                    <Plus size={20} />
                    New User
                </Link>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-black">
                            <th className="p-4 font-bold">Avatar</th>
                            <th className="p-4 font-bold">Username</th>
                            <th className="p-4 font-bold">Email</th>
                            <th className="p-4 font-bold">Role</th>
                            <th className="p-4 font-bold">Score</th>
                            <th className="p-4 font-bold">Last Poll</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => {
                            const profile = profiles.find(p => p.id === u.id);
                            const userRole = profile?.role || 'user';
                            const username = profile?.avatar_name || '-';
                            const avatarUrl = profile?.avatar_image;
                            const score = profile?.score || 0;
                            const lastVote: any = lastPollMap.get(u.id);

                            const canManage = (currentUserRole === 'superadmin') || (currentUserRole === 'admin' && userRole === 'user');

                            return (
                                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={username} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xs">
                                                ?
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 font-medium text-gray-700">{username}</td>
                                    <td className="p-4 font-medium">{u.email}</td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded border font-bold uppercase ${userRole === 'superadmin' ? 'bg-purple-100 border-purple-300 text-purple-700' :
                                            userRole === 'admin' ? 'bg-blue-100 border-blue-300 text-blue-700' :
                                                'bg-gray-100 border-gray-300 text-gray-700'
                                            }`}>
                                            {userRole}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-yellow-600">
                                        {score > 0 && <span>⭐️</span>} {score}
                                    </td>
                                    <td className="p-4 text-xs font-mono text-gray-500">
                                        {lastVote ? (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-black truncate max-w-[150px]" title={lastVote.polls?.title}>
                                                    {lastVote.polls?.title}
                                                </span>
                                                <span>
                                                    Stage {lastVote.polls?.stage} &gt; Level {lastVote.polls?.level}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 flex justify-end gap-2">
                                        <Link href={`/admin/users/${u.id}`} className="p-2 text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors" title="View">
                                            <Eye size={18} />
                                        </Link>

                                        {canManage && (
                                            <>
                                                <Link href={`/admin/users/${u.id}/edit`} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                    <Edit size={18} />
                                                </Link>
                                                <ConfirmDeleteButton
                                                    action={deleteUser}
                                                    itemId={u.id}
                                                    itemType="user"
                                                    fieldName="userId"
                                                />
                                            </>
                                        )}
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
