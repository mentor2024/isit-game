"use client";

import { useState } from "react";
import { DiscussionComment } from "@/app/(main)/poll/discussion-actions";
import UserAvatar from "./UserAvatar";
import CommentInput from "./CommentInput";
import { Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CommentThread({
    comment,
    pollId,
    currentUserId,
    depth = 0
}: {
    comment: DiscussionComment;
    pollId: string;
    currentUserId?: string;
    depth?: number;
}) {
    const [isReplying, setIsReplying] = useState(false);

    // Limit nesting depth visual indentation if needed
    // const isOwner = currentUserId === comment.user_id;

    return (
        <div className="flex gap-3 relative group">
            {/* Thread Line for children */}
            {comment.children && comment.children.length > 0 && (
                <div className="absolute left-[1.25rem] top-10 bottom-0 w-0.5 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors" />
            )}

            <div className="flex-shrink-0 z-10">
                <UserAvatar
                    image={comment.user_profiles?.avatar_image}
                    name={comment.user_profiles?.avatar_name}
                    size="md"
                />
            </div>
            <div className="flex-1 min-w-0 pb-4">
                <div className="bg-gray-50 p-4 rounded-3xl rounded-tl-none border border-transparent hover:border-gray-200 transition-all">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-exhibit font-bold text-sm text-black">
                            {comment.user_profiles?.avatar_name || "Anonymous"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                </div>

                <div className="flex items-center gap-4 mt-2 ml-2">
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className={`text-xs font-bold flex items-center gap-1 transition-all px-3 py-1 rounded-full ${isReplying ? "bg-black text-white" : "text-gray-400 hover:text-black hover:bg-gray-100"}`}
                    >
                        <Reply size={12} /> Reply
                    </button>
                    {/* Delete button logic here if needed */}
                </div>

                {isReplying && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 ml-2">
                        <CommentInput
                            pollId={pollId}
                            parentId={comment.id}
                            onPosted={() => setIsReplying(false)}
                            placeholder={`Reply to ${comment.user_profiles?.avatar_name || "user"}...`}
                        />
                    </div>
                )}

                {/* Recursive Children */}
                {comment.children && comment.children.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {comment.children.map(child => (
                            <CommentThread
                                key={child.id}
                                comment={child}
                                pollId={pollId}
                                currentUserId={currentUserId}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
