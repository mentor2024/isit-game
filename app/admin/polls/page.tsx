import Link from "next/link";
import { Eye, Edit, Trash2, Plus, Play } from "lucide-react";
import { deletePoll } from "../poll-actions";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import ClonePollButton from "@/components/ClonePollButton";
import EditableHierarchyCell from "@/components/EditableHierarchyCell";
import PollFilters from "@/components/PollFilters";
import { getServiceRoleClient } from "@/lib/supabaseServer";

export const dynamic = 'force-dynamic';

export default async function AdminPollsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    const stage = params.stage as string;
    const level = params.level as string;
    const poll_order = params.poll_order as string;
    const type = params.type as string;
    const search = params.search as string;

    // Sort params
    const sort_by = (params.sort_by as string) || 'created_at';
    const sort_order = (params.sort_order as string) === 'asc' ? 'asc' : 'desc';

    const adminClient = getServiceRoleClient();

    let query = adminClient.from('polls').select('*');

    // Search
    if (search) {
        const { data: objectMatches } = await adminClient
            .from('poll_objects')
            .select('poll_id')
            .ilike('text', `%${search}%`);

        const objectPollIds = objectMatches?.map(o => o.poll_id) || [];
        const uniqueObjectPollIds = Array.from(new Set(objectPollIds));

        if (uniqueObjectPollIds.length > 0) {
            query = query.or(`title.ilike.%${search}%,id.in.(${uniqueObjectPollIds.join(',')})`);
        } else {
            query = query.ilike('title', `%${search}%`);
        }
    }

    // Filters
    if (stage) query = query.eq('stage', stage);
    if (level) query = query.eq('level', level);
    if (poll_order) query = query.eq('poll_order', poll_order);
    if (type) query = query.eq('type', type);

    // Dynamic Sort
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Secondary sorts for stability
    if (sort_by !== 'stage') query = query.order('stage', { ascending: true });
    if (sort_by !== 'level') query = query.order('level', { ascending: true });
    if (sort_by !== 'poll_order') query = query.order('poll_order', { ascending: true });
    if (sort_by !== 'created_at') query = query.order('created_at', { ascending: false });

    const { data: polls } = await query;

    // Helper to generate sort URLs
    const getSortUrl = (col: string) => {
        const newOrder = sort_by === col && sort_order === 'asc' ? 'desc' : 'asc';
        const p = new URLSearchParams();
        if (stage) p.set('stage', stage);
        if (level) p.set('level', level);
        if (poll_order) p.set('poll_order', poll_order);
        if (type) p.set('type', type);
        if (search) p.set('search', search);
        p.set('sort_by', col);
        p.set('sort_order', newOrder);
        return `?${p.toString()}`;
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sort_by !== col) return <span className="text-gray-300 ml-1 text-[10px]">↕</span>;
        return sort_order === 'asc' ? <span className="ml-1 text-xs">↑</span> : <span className="ml-1 text-xs">↓</span>;
    };

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-4xl font-black">Polls</h1>
                <Link href="/admin/polls/new" className="bg-black text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                    <Plus size={20} />
                    New Poll
                </Link>
            </div>

            <PollFilters />

            <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-black text-sm">
                            <th className="p-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                                <Link href={getSortUrl('type')} className="flex items-center w-full h-full">Type <SortIcon col="type" /></Link>
                            </th>
                            <th className="p-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors">
                                <Link href={getSortUrl('title')} className="flex items-center w-full h-full">Title <SortIcon col="title" /></Link>
                            </th>
                            <th className="p-3 font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors">
                                <Link href={getSortUrl('stage')} className="flex items-center justify-center w-full h-full">Stage <SortIcon col="stage" /></Link>
                            </th>
                            <th className="p-3 font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors">
                                <Link href={getSortUrl('level')} className="flex items-center justify-center w-full h-full">Level <SortIcon col="level" /></Link>
                            </th>
                            <th className="p-3 font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors">
                                <Link href={getSortUrl('poll_order')} className="flex items-center justify-center w-full h-full">Order <SortIcon col="poll_order" /></Link>
                            </th>
                            <th className="p-3 font-bold text-center">Instructions</th>
                            <th className="p-3 font-bold text-center cursor-pointer hover:bg-gray-100 transition-colors">
                                <Link href={getSortUrl('created_at')} className="flex items-center justify-center w-full h-full">Created <SortIcon col="created_at" /></Link>
                            </th>
                            <th className="p-3 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {polls?.map((poll) => (
                            <tr key={poll.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                                <td className="p-3">
                                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${poll.type === "isit_image"
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : poll.type === "quad_sorting"
                                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                                            : poll.type === "multiple_choice"
                                                ? "bg-green-100 text-green-800 border border-green-200"
                                                : "bg-gray-100 text-gray-800 border border-gray-200"
                                        }`}>
                                        {poll.type === "isit_image"
                                            ? "ISIT Image"
                                            : poll.type === "quad_sorting"
                                                ? "Quad Sort"
                                                : poll.type === "multiple_choice"
                                                    ? "Multi-choice (points)"
                                                    : "ISIT Text"
                                        }
                                    </span>
                                </td>
                                <td className="p-3 font-bold min-w-[240px]">{poll.title}</td>
                                <td className="p-3 bg-gray-50 text-center">
                                    <EditableHierarchyCell pollId={poll.id} field="stage" initialValue={poll.stage ?? 1} />
                                </td>
                                <td className="p-3 bg-gray-50 text-center">
                                    <EditableHierarchyCell pollId={poll.id} field="level" initialValue={poll.level || 1} />
                                </td>
                                <td className="p-3 text-center">
                                    <EditableHierarchyCell pollId={poll.id} field="poll_order" initialValue={poll.poll_order || 1} />
                                </td>
                                <td className="p-3 text-gray-500 text-xs max-w-[12rem] truncate">
                                    {poll.instructions?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}
                                </td>
                                <td className="p-3 text-gray-400 text-[10px] font-mono whitespace-nowrap">{new Date(poll.created_at).toLocaleDateString()}</td>
                                <td className="p-3 flex justify-end gap-2">
                                    <Link href={`/poll?preview=${poll.id}`} target="_blank" className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors" title="Test / Preview">
                                        <Play size={16} />
                                    </Link>
                                    <ClonePollButton pollId={poll.id} />
                                    <Link href={`/admin/polls/${poll.id}`} className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-lg transition-colors" title="View">
                                        <Eye size={16} />
                                    </Link>
                                    <Link href={`/admin/polls/${poll.id}/edit`} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                        <Edit size={16} />
                                    </Link>
                                    <ConfirmDeleteButton
                                        action={deletePoll}
                                        itemId={poll.id}
                                        itemType="poll"
                                        fieldName="pollId"
                                    />
                                </td>
                            </tr>
                        ))}
                        {(!polls || polls.length === 0) && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-400 italic">No polls found. Create one!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
