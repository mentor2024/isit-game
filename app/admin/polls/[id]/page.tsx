
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { formatStage, formatLevel } from "@/lib/formatters";
import { getServiceRoleClient } from "@/lib/supabaseServer";

async function getPoll(id: string) {
    const adminClient = getServiceRoleClient();

    const { data: poll } = await adminClient
        .from('polls')
        .select('*, poll_objects(*), poll_votes(count)')
        .eq('id', id)
        .single();

    // Get exact vote counts if needed, but the simple count is just total rows
    // For breakdown we might need more aggregated query or just client side if small

    return poll;
}

export default async function PollDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const poll = await getPoll(id);

    if (!poll) return <div className="p-8">Poll not found</div>;

    const totalVotes = poll.poll_votes ? poll.poll_votes[0]?.count : 0; // Fix if count logic differs

    // Actual vote count query since we can't trust the simple singular view for aggregation
    const adminClient = getServiceRoleClient();
    const { count } = await adminClient.from('poll_votes').select('*', { count: 'exact', head: true }).eq('poll_id', id);


    // Sort objects by ID (which contains index) to ensure Object 1 comes before Object 2
    const objects = poll.poll_objects?.sort((a: any, b: any) => a.id.localeCompare(b.id)) || [];

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin/polls" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Polls
            </Link>

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black">Poll Details</h1>
                <Link href={`/admin/polls/${id}/edit`} className="bg-black text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                    <Edit size={20} />
                    Edit
                </Link>
            </div>

            <div className="grid gap-6">

                {/* Main Info Card */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left: Details */}
                        <div className="flex-1">
                            {/* Hierarchy Info */}
                            <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stage</label>
                                    <div className="text-xl font-bold font-mono">{formatStage(poll.stage || 1)}</div>
                                </div>
                                <div className="w-px bg-gray-200"></div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Level</label>
                                    <div className="text-xl font-bold font-mono">{formatLevel(poll.level || 1)}</div>
                                </div>
                                <div className="w-px bg-gray-200"></div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order</label>
                                    <div className="text-xl font-bold font-mono">{poll.poll_order || 1}</div>
                                </div>
                            </div>

                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title</label>
                                <div className="text-2xl font-bold">{poll.title}</div>
                            </div>

                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type</label>
                                <div className="text-lg font-bold">
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${poll.type === "isit_image" ? "bg-blue-100 text-blue-800" :
                                        poll.type === "quad_sorting" ? "bg-purple-100 text-purple-800" :
                                            poll.type === "multiple_choice" ? "bg-green-100 text-green-800" :
                                                "bg-gray-100 text-gray-800"
                                        }`}>
                                        {poll.type === "isit_image" ? "ISIT Image" :
                                            poll.type === "quad_sorting" ? "Quad Sorting" :
                                                poll.type === "multiple_choice" ? "Multi-choice (points)" :
                                                    "ISIT Text"}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6 pb-6 border-b border-gray-100">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instructions</label>
                                <div
                                    className="text-lg text-gray-700 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: poll.instructions }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Votes</label>
                                <div className="text-4xl font-black">{count || 0}</div>
                            </div>
                        </div>

                        {/* Right: Images (only for image polls OR quad sorting) */}
                        {(poll.type === "isit_image" || poll.type === "quad_sorting") && (
                            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Poll Images</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {objects.map((obj: any, index: number) => (
                                        <div key={obj.id} className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative aspect-square">
                                            {obj.image_url ? (
                                                <img
                                                    src={obj.image_url}
                                                    alt={obj.text}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs font-bold">
                                                    No Image
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold px-2 py-1 backdrop-blur-sm">
                                                {obj.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Objects Metadata */}
                <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black">
                    <h3 className="text-xl font-bold mb-6">Objects Configuration</h3>
                    {poll.type === 'multiple_choice' ? (
                        <div className="flex flex-col gap-3">
                            {objects.map((obj: any, index: number) => (
                                <div key={obj.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-6 flex-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-24">
                                            Response {index + 1}
                                        </label>
                                        <div className="text-lg font-bold">{obj.text}</div>
                                    </div>
                                    <span className="text-xs font-black px-3 py-1.5 rounded-md text-white bg-green-600 whitespace-nowrap ml-4">
                                        {obj.points || 0} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-4">
                            {objects.map((obj: any, index: number) => (
                                <div key={obj.id} className="flex-1 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                                            Object {index + 1}
                                        </label>
                                        <span className={`text-xs font-black px-2 py-1 rounded-md text-white ${obj.correct_side === 'IS' ? 'bg-black' :
                                            obj.correct_side === 'IT' ? 'bg-black' : 'bg-gray-400'
                                            }`}>
                                            {obj.correct_side || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="text-xl font-bold">{obj.text}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
