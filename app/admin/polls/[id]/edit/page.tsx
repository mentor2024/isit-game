import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updatePoll } from "../../../poll-actions";
import { createServerClient } from "@supabase/ssr";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";
import PollObjectEditor from "@/components/PollObjectEditor";

async function getPoll(id: string) {
    const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );
    const { data: poll } = await adminClient.from('polls').select('*, poll_objects(*)').eq('id', id).single();
    return poll;
}

export default async function EditPollPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const poll = await getPoll(id);
    console.log(`[EditPollPage] Loaded Poll ${id}: Stage =`, poll?.stage, typeof poll?.stage);

    if (!poll) return <div className="p-8">Poll not found</div>;

    // Fetch vote count to determine if objects can be edited
    const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );
    const { count: voteCount } = await adminClient.from('poll_votes').select('*', { count: 'exact', head: true }).eq('poll_id', id);

    // Sort objects by ID (which contains index)
    const objects = poll.poll_objects?.sort((a: any, b: any) => a.id.localeCompare(b.id)) || [];

    return (
        <div className="max-w-2xl mx-auto p-8">
            <Link href="/admin/polls" className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 font-bold">
                <ArrowLeft size={20} />
                Back to Polls
            </Link>

            <h1 className="text-4xl font-black mb-8">Edit Poll</h1>

            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black">
                <form action={updatePoll} className="flex flex-col gap-6">
                    <input type="hidden" name="pollId" value={poll.id} />

                    <div className="flex flex-col gap-2">
                        <label className="font-bold">Title</label>
                        <input name="title" defaultValue={poll.title} required className="border-2 border-black p-3 rounded-xl" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="font-bold">{poll.type === 'multiple_choice' ? 'Question' : 'Instructions (General)'}</label>
                        <input name="instructions" defaultValue={poll.instructions} required className="border-2 border-black p-3 rounded-xl" />
                    </div>

                    {poll.type !== 'quad_sorting' && poll.type !== 'multiple_choice' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="font-bold text-green-700">Correct Answer Feedback</label>
                                <textarea
                                    name="instructions_correct"
                                    defaultValue={poll.instructions_correct || ""}
                                    placeholder="Message shown when they get it RIGHT"
                                    className="border-2 border-green-200 p-3 rounded-xl min-h-[80px]"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="font-bold text-red-700">Incorrect Answer Feedback</label>
                                <textarea
                                    name="instructions_incorrect"
                                    defaultValue={poll.instructions_incorrect || ""}
                                    placeholder="Message shown when they get it WRONG"
                                    className="border-2 border-red-200 p-3 rounded-xl min-h-[80px]"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="font-bold">Stage</label>
                            <select name="stage" defaultValue={poll.stage !== undefined ? poll.stage : 1} required className="border-2 border-black p-3 rounded-xl bg-white">
                                <option value="0">Zero</option>
                                {STAGE_NAMES.map((name, i) => (
                                    <option key={i} value={i + 1}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-bold">Level</label>
                            <select name="level" defaultValue={poll.level || 1} required className="border-2 border-black p-3 rounded-xl bg-white">
                                {LEVEL_LETTERS.map((char, i) => (
                                    <option key={i} value={i + 1}>{char}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-bold">Order</label>
                            <input
                                name="poll_order"
                                type="number"
                                defaultValue={poll.poll_order || 1}
                                min="1"
                                max="20"
                                required
                                className="border-2 border-black p-3 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Objects Editing (Only if no votes) */}
                    {voteCount === 0 ? (
                        <>
                            <hr className="border-black/10" />
                            <div className={`grid gap-6 ${poll.type === 'quad_sorting' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                                {(() => {
                                    // Determine number of objects based on type
                                    let objectCount = 2;
                                    if (poll.type === 'quad_sorting') objectCount = 4;
                                    if (poll.type === 'multiple_choice') objectCount = objects.length > 0 ? objects.length : 4;

                                    const slots = Array.from({ length: objectCount }, (_, i) => i + 1);

                                    // Render simplified list for Multiple Choice
                                    if (poll.type === 'multiple_choice') {
                                        return (
                                            <div className="col-span-1 md:col-span-2 flex flex-col gap-3">
                                                {slots.map((num, i) => {
                                                    const obj = objects[i];
                                                    return (
                                                        <div key={num} className="flex items-center gap-4 p-2 border-b border-gray-100 last:border-0">
                                                            <div className="w-8 font-bold text-gray-400 text-sm">#{num}</div>
                                                            <div className="flex-1">
                                                                <input
                                                                    name={`obj${num}_text`}
                                                                    defaultValue={obj?.text}
                                                                    placeholder={`Option ${num}`}
                                                                    required
                                                                    className="w-full border-b border-gray-300 focus:border-black outline-none p-2 bg-transparent"
                                                                />
                                                                <input type="hidden" name={`obj${num}_id`} value={obj.id} />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex flex-col items-end">
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Points</label>
                                                                    <input
                                                                        type="number"
                                                                        name={`obj${num}_points`}
                                                                        defaultValue={obj?.points ?? 0}
                                                                        min="0"
                                                                        max="20"
                                                                        className="w-16 border border-gray-300 rounded p-1 text-center font-bold"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    return slots.map((num, i) => {
                                        const obj = objects[i];
                                        return (
                                            <div key={num} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                <h3 className="font-bold mb-3">Object {num}</h3>
                                                <div className="flex flex-col gap-3">
                                                    {(poll.type === "image_isit" || poll.type === "quad_sorting") && (
                                                        <>
                                                            {obj?.image_url && (
                                                                <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-200 border border-gray-300">
                                                                    <img src={obj.image_url} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <input type="file" name={`obj${num}_image`} accept="image/*" className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-white" />
                                                        </>
                                                    )}

                                                    <input
                                                        name={`obj${num}_text`}
                                                        defaultValue={obj?.text}
                                                        placeholder={poll.type === "image_isit" ? "Label / Alt Text" : "Word"}
                                                        required
                                                        className="border-2 border-black p-2 rounded-lg"
                                                    />

                                                    {poll.type === 'multiple_choice' ? (
                                                        null // Handled above
                                                    ) : (
                                                        <div className="flex gap-4 mt-2">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name={`obj${num}_side`} value="IS" defaultChecked={obj?.correct_side === 'IS'} required className="accent-black w-5 h-5" />
                                                                <span className="font-bold">IS</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name={`obj${num}_side`} value="IT" defaultChecked={obj?.correct_side === 'IT'} required className="accent-black w-5 h-5" />
                                                                <span className="font-bold">IT</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </>
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500">
                            Note: Editing Objects is not currently supported because this poll already has votes. To change objects, please create a new poll.
                        </div>
                    )}

                    {poll.type === 'quad_sorting' && (
                        <div className="mt-8 bg-purple-50 p-6 rounded-xl border-2 border-purple-200">
                            <h3 className="font-bold text-xl mb-4 text-purple-900">Quad Grouping Scores</h3>

                            {/* Reference Images */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {[1, 2, 3, 4].map((num, i) => {
                                    const obj = objects[i];
                                    return (
                                        <div key={num} className="bg-white p-2 rounded-lg border border-purple-100 text-center">
                                            <div className="text-xs font-bold text-purple-900 mb-1">Obj {num}</div>
                                            {obj?.image_url ? (
                                                <img src={obj.image_url} className="w-16 h-16 object-cover mx-auto rounded mb-1" />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-100 mx-auto rounded mb-1 flex items-center justify-center text-xs text-gray-400">No Img</div>
                                            )}
                                            <div className="text-[10px] truncate" title={obj?.text}>{obj?.text || "-"}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-sm text-purple-700 mb-4">Assign points for each pairing combination.</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm">Obj 1 & 2</label>
                                    <input
                                        type="number"
                                        name="score_12"
                                        defaultValue={poll.quad_scores?.['1-2'] ?? 0}
                                        className="border-2 border-purple-200 p-2 rounded-lg"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm">Obj 1 & 3</label>
                                    <input
                                        type="number"
                                        name="score_13"
                                        defaultValue={poll.quad_scores?.['1-3'] ?? 0}
                                        className="border-2 border-purple-200 p-2 rounded-lg"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm">Obj 1 & 4</label>
                                    <input
                                        type="number"
                                        name="score_14"
                                        defaultValue={poll.quad_scores?.['1-4'] ?? 0}
                                        className="border-2 border-purple-200 p-2 rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button className="bg-black text-white py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-lg mt-4">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}
