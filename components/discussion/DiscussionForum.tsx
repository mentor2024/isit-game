import { getComments, DiscussionComment } from "@/app/(main)/poll/discussion-actions";
import CommentThread from "./CommentThread";
import CommentInput from "./CommentInput";

// Helper to build tree
function buildCommentTree(comments: DiscussionComment[]) {
    const map = new Map<string, DiscussionComment>();
    const roots: DiscussionComment[] = [];

    // Initialize map
    comments.forEach(c => {
        map.set(c.id, { ...c, children: [] });
    });

    // Build tree
    comments.forEach(c => {
        const node = map.get(c.id)!;
        if (c.parent_id && map.has(c.parent_id)) {
            map.get(c.parent_id)!.children!.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export default async function DiscussionForum({
    pollId,
    currentUser
}: {
    pollId: string;
    currentUser?: { id: string; avatar_name?: string | null; avatar_image?: string | null }
}) {
    const comments = await getComments(pollId);
    const rootComments = buildCommentTree(comments);

    return (
        <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-200 w-full" id="discussion">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black flex items-center gap-3">
                        💬 Discussion
                        <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            {comments.length}
                        </span>
                    </h3>
                </div>

                {currentUser ? (
                    <div className="mb-10 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                            Join the conversation
                        </label>
                        <div className="flex gap-4 items-start">
                            {/* Input handles avatar if we want, or just simple input */}
                            <CommentInput pollId={pollId} />
                        </div>
                    </div>
                ) : (
                    <div className="mb-10 p-8 bg-gray-50 rounded-3xl text-center border-2 border-gray-200 border-dashed">
                        <p className="text-gray-500 font-medium text-lg">
                            <a href="/login" className="text-black font-black underline decoration-2 underline-offset-4 hover:decoration-4 transition-all">Log in</a> to join the discussion.
                        </p>
                    </div>
                )}

                <div className="space-y-8">
                    {rootComments.map(comment => (
                        <CommentThread
                            key={comment.id}
                            comment={comment}
                            pollId={pollId}
                            currentUserId={currentUser?.id}
                        />
                    ))}
                </div>

                {comments.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p className="italic">No comments yet. Be the first!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
