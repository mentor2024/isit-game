import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateUser } from "../../../actions";
import { getServiceRoleClient } from "@/lib/supabaseServer";
import AdminUserForm from "@/components/AdminUserForm";

async function getUser(id: string) {
    const serviceClient = getServiceRoleClient();
    const { data: { user } } = await serviceClient.auth.admin.getUserById(id);
    const { data: profile } = await serviceClient.from('user_profiles').select('*').eq('id', id).single();
    return { user, profile };
}

export default async function EditUserPage({
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
    const currentRole = profile?.role || 'user';

    return (
        <div className="max-w-2xl mx-auto p-8">
            <Link href="/admin/users" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Users
            </Link>

            {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 font-bold">
                    <span>✅</span>
                    {message}
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 font-bold">
                    {error}
                </div>
            )}

            <h1 className="text-4xl font-black mb-8">Edit User</h1>

            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black">
                <AdminUserForm
                    mode="edit"
                    action={updateUser}
                    initialData={{
                        id: user.id,
                        email: user.email,
                        role: currentRole,
                        avatar_name: profile?.avatar_name,
                        avatar_image: profile?.avatar_image
                    }}
                />
            </div>

            {/* Danger Zone */}
            <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h3>

                <div className="flex gap-4">
                    <form action={async (formData) => {
                        "use server";
                        const { resetUserProgress } = await import("../../../actions");
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
