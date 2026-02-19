"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface AdminUserFormProps {
    mode: "create" | "edit";
    initialData?: {
        id?: string;
        email?: string;
        role?: string;
        avatar_name?: string;
        avatar_image?: string;
    };
    action: (formData: FormData) => Promise<void>;
}

export default function AdminUserForm({ mode, initialData, action }: AdminUserFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_image || "");
    const [role, setRole] = useState(initialData?.role || "user");
    const [currentRole] = useState(initialData?.role || "user"); // Assuming passed prop includes permissions or simplify

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        if (file.size > 512 * 1024) {
            alert("File size exceeds 512KB limit.");
            e.target.value = ""; // Reset input
            return;
        }

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`; // Ideally use userId prefix, but randomized is fine for MVP public

            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        } catch (error: any) {
            alert("Error uploading avatar: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        if (avatarUrl) formData.set("avatar_image", avatarUrl);

        // If editing, ensure userId is set
        if (mode === 'edit' && initialData?.id) {
            formData.set("userId", initialData.id);
        }

        try {
            await action(formData);
            // Optional: redirect handled in server action, but visual feedback helps
        } catch (error: any) {
            // handled by server redirect usually
            alert("Error saving: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Read-Only email for edit */}
            {mode === 'edit' ? (
                <div className="flex flex-col gap-2">
                    <label className="font-bold">Email</label>
                    <input disabled value={initialData?.email} className="border-2 border-gray-200 bg-gray-50 p-3 rounded-xl cursor-not-allowed" />
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <label className="font-bold">Email</label>
                    <input name="email" type="email" required className="border-2 border-black p-3 rounded-xl" />
                </div>
            )}

            {mode === 'create' && (
                <div className="flex flex-col gap-2">
                    <label className="font-bold">Password</label>
                    <input name="password" type="password" required minLength={6} className="border-2 border-black p-3 rounded-xl" />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <label className="font-bold">Username (Avatar Name)</label>
                <input
                    name="avatar_name"
                    defaultValue={initialData?.avatar_name || ""}
                    placeholder="Display Name"
                    className="border-2 border-black p-3 rounded-xl"
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="font-bold">Avatar Image</label>
                <div className="flex items-center gap-4">
                    {avatarUrl && (
                        <div className="relative w-24 h-24 rounded-full border border-gray-200 overflow-hidden shrink-0">
                            <Image src={avatarUrl} alt="Preview" fill className="object-cover" />
                        </div>
                    )}
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-black file:text-white
                                hover:file:bg-gray-800
                            "
                        />
                        <p className="text-xs text-gray-500 mt-1">Max 512KB</p>
                        {uploading && <p className="text-xs text-blue-500 font-bold mt-1">Uploading...</p>}
                    </div>
                </div>
                {/* Hidden input to ensure URL is submitted if not changed via JS manually (though we hijack submit) */}
                <input type="hidden" name="avatar_image" value={avatarUrl} />
            </div>

            <div className="flex flex-col gap-2">
                <label className="font-bold">Role</label>
                <select
                    name={mode === 'edit' ? "newRole" : "role"}
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="border-2 border-black p-3 rounded-xl bg-white"
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                </select>
            </div>

            <button
                type="submit"
                disabled={loading || uploading}
                className="bg-black text-white py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-lg mt-4 disabled:opacity-50"
            >
                {loading ? "Saving..." : (mode === 'create' ? "Create User" : "Save Changes")}
            </button>
        </form>
    );
}
