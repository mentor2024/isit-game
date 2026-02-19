import { getServiceRoleClient } from "@/lib/supabaseServer";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, FileText, Bug } from "lucide-react";
import DeleteFeedbackButton from "./DeleteFeedbackButton";
import FeedbackTextCell from "./FeedbackTextCell";

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
    // Use direct Supabase client with Service Role Key
    const supabase = getServiceRoleClient();

    // 1. Fetch Feedback
    const { data: feedbackItems, error } = await supabase
        .from('feedback')
        .select('*') // No join with user_profiles
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching feedback:", JSON.stringify(error, null, 2));
    }

    // 2. Fetch User Emails Manually (since user_profiles doesn't have email)
    const items = feedbackItems || [];
    const userIds = Array.from(new Set(items.map(i => i.user_id).filter(Boolean)));
    const userMap = new Map<string, string>(); // ID -> Email

    if (userIds.length > 0) {
        // We can't filter listUsers by ID array easily in one go efficiently for huge sets, 
        // but for < 50 users usually fetching pages is okay. 
        // Better approach: Since we are admin, let's just use `listUsers` and map locally if list is small,
        // OR loop getUserById for precision if we want to be safe. 
        // Actually, createClient (service_role) allows accessing auth.users table? No, via API only.

        // For efficiency, we'll try to get them. 
        // There is no bulk "getUsersByIds" in auth admin API publicly documented as stable.
        // Let's iterate parallelly for now (limited batch size ideally).

        await Promise.all(userIds.map(async (uid) => {
            const { data: { user }, error: uErr } = await supabase.auth.admin.getUserById(uid);
            if (user && user.email) {
                userMap.set(uid, user.email);
            }
        }));
    }

    return (
        <div className="max-w-6xl mx-auto p-8">
            <h1 className="text-4xl font-black mb-8">User Feedback</h1>

            <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-black">
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">Date</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">Type</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">User</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 w-full">Feedback</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">Context</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap">Attachment</th>
                                <th className="p-4 font-bold text-sm uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${item.feedback_type === 'Bug Report'
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                            {item.feedback_type === 'Bug Report' ? <Bug size={12} /> : <FileText size={12} />}
                                            {item.feedback_type}
                                        </span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-sm font-bold">
                                        {item.user_id ? (
                                            <a
                                                href={`/admin/users/${item.user_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-black hover:underline"
                                            >
                                                {userMap.get(item.user_id) || "Unknown User"}
                                            </a>
                                        ) : <span className="text-gray-400 italic">Anonymous</span>}
                                    </td>
                                    <td className="p-4">
                                        <FeedbackTextCell text={item.feedback} />
                                    </td>
                                    <td className="p-4 text-xs font-mono text-gray-500">
                                        {item.context ? (
                                            item.context.pollId ? (
                                                <a
                                                    href={`/admin/polls/${item.context.pollId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex flex-col gap-1 hover:text-blue-600 hover:bg-blue-50 p-1 -m-1 rounded transition-colors group"
                                                    title="View Poll"
                                                >
                                                    {item.context.stage !== undefined && <span>Stage: {item.context.stage}</span>}
                                                    {item.context.level !== undefined && <span>Level: {item.context.level}</span>}
                                                    {item.context.pollOrder !== undefined && <span>Poll: {item.context.pollOrder}</span>}
                                                    <span className="hidden group-hover:inline text-[10px] uppercase font-bold text-blue-400 mt-1">View Poll →</span>
                                                </a>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {item.context.stage !== undefined && <span>Stage: {item.context.stage}</span>}
                                                    {item.context.level !== undefined && <span>Level: {item.context.level}</span>}
                                                    {item.context.pollOrder !== undefined && <span>Poll: {item.context.pollOrder}</span>}
                                                </div>
                                            )
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        {item.attachment_url ? (
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feedback_attachments/${item.attachment_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm font-bold"
                                            >
                                                <ExternalLink size={14} />
                                                View File
                                            </a>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-right">
                                        <DeleteFeedbackButton id={item.id} attachmentUrl={item.attachment_url} />
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                                        No feedback submitted yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
