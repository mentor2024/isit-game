import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createUser, deleteUser, updateUserRole } from "./actions";

async function getSupabaseAndUser() {
    const cookieStore = await cookies();

    // 1. Standard Client for Auth (Session Validation)
    // We must use the standard client to validate the User's session cookie.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
        // Debug log for development
        console.log("Admin Page: No authenticated user found.", authError);
        return { supabase, user: null, role: null };
    }

    // 2. Service Role Client for Role Lookup (Bypass RLS)
    // The standard client might be blocked by RLS policies from reading the role.
    // We use the Service Role key to definitively check the user's role.
    const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() { return [] },
                setAll() { }
            },
        }
    );

    const { data: profile, error: roleError } = await serviceClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (roleError) {
        console.error("Admin Page: Error fetching role for user", user.id, roleError);
    }

    return { supabase, user, role: profile?.role };
}

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const { supabase, user, role } = await getSupabaseAndUser();
    const params = await searchParams;

    // Strict Authorization Check
    if (!user || (role !== 'admin' && role !== 'superadmin')) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8 text-center bg-gray-50">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <h1 className="text-2xl font-black mb-4">Unauthorized</h1>
                    <p className="mb-6">You do not have permission to access this page.</p>
                    <p className="text-sm text-gray-500 mb-6">Current User: {user?.email || 'None'}</p>
                    <p className="text-sm text-gray-500 mb-6">Current Role: {role || 'None'}</p>
                    <a href="/poll" className="block w-full bg-black text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform">
                        Return to Poll
                    </a>
                </div>
            </div>
        );
    }

    // Fetch all users using Service Role Client
    const createServiceRoleClient = () => createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );
    const adminClient = createServiceRoleClient();

    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

    // Also fetch roles
    const { data: profiles } = await adminClient.from('user_profiles').select('*');
    const roleMap = new Map(profiles?.map(p => [p.id, p.role]));

    if (listError) return <div>Error loading users: {listError.message}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-4xl font-black">Admin Dashboard</h1>
                <div className="text-right">
                    <p className="font-bold">{user.email}</p>
                    <p className="text-sm bg-black text-white px-2 py-0.5 rounded inline-block">{role?.toUpperCase()}</p>
                </div>
            </div>

            {params.error && (
                <div className="mb-8 p-4 bg-red-100 border-2 border-red-500 text-red-700 rounded-xl font-bold">
                    Error: {params.error}
                </div>
            )}

            {/* Create User Form */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black mb-12 max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">Create New User</h2>
                <form action={createUser} className="flex flex-col gap-4">
                    <input name="email" placeholder="Email" required className="border-2 border-black p-3 rounded-xl" />
                    <input name="password" type="password" placeholder="Password (min 6 chars)" required minLength={6} className="border-2 border-black p-3 rounded-xl" />
                    <select name="role" className="border-2 border-black p-3 rounded-xl bg-white">
                        <option value="user">User</option>
                        {role === 'superadmin' && <option value="admin">Admin</option>}
                        {role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                    </select>
                    <button className="bg-black text-white py-3 rounded-full font-bold hover:scale-105 transition-transform">Create User</button>
                </form>
            </div>

            {/* User List */}
            <h2 className="text-2xl font-bold mb-4">Users ({users?.length || 0})</h2>
            <div className="grid gap-4">
                {users?.map((u) => {
                    const userRole = roleMap.get(u.id) || 'user';
                    return (
                        <div key={u.id} className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <div className="font-bold text-lg">{u.email}</div>
                                <div className="text-sm text-gray-500 font-mono">ID: {u.id}</div>
                                <div className="mt-2 inline-block bg-gray-100 px-3 py-1 rounded-full text-sm font-bold border border-black">
                                    {userRole.toUpperCase()}
                                </div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                {(role === 'superadmin') && (
                                    <form action={updateUserRole} className="flex gap-2">
                                        <input type="hidden" name="userId" value={u.id} />
                                        <select name="newRole" defaultValue={userRole} className="border-2 border-black px-2 py-1 rounded-lg text-sm">
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Superadmin</option>
                                        </select>
                                        <button className="bg-white border-2 border-black px-3 py-1 rounded-lg text-sm font-bold hover:bg-gray-100">Update Role</button>
                                    </form>
                                )}

                                {(role === 'superadmin' || (role === 'admin' && userRole === 'user')) && (
                                    <form action={deleteUser}>
                                        <input type="hidden" name="userId" value={u.id} />
                                        <button className="bg-red-500 border-2 border-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition-colors">
                                            Delete
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <a href="/poll" className="block mt-12 text-center underline font-bold">Back to Poll</a>
        </div>
    );
}
