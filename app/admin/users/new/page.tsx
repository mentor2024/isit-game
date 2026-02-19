import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createUser } from "../../actions";
import AdminUserForm from "@/components/AdminUserForm";

export default function NewUserPage() {
    return (
        <div className="max-w-2xl mx-auto p-8">
            <Link href="/admin/users" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Users
            </Link>

            <h1 className="text-4xl font-black mb-8">Create New User</h1>

            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black">
                <AdminUserForm mode="create" action={createUser} />
            </div>
        </div>
    );
}
