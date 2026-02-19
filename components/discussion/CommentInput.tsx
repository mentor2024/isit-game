"use client";

import { useState } from "react";
import { postComment } from "@/app/(main)/poll/discussion-actions";
import { Send, Loader2 } from "lucide-react";

export default function CommentInput({
    pollId,
    parentId,
    onPosted,
    placeholder = "Write a comment..."
}: {
    pollId: string;
    parentId?: string;
    onPosted?: () => void;
    placeholder?: string;
}) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        // Pass parentId explicitly (undefined if top-level)
        const result = await postComment(pollId, content, parentId);
        setLoading(false);

        if (result.success) {
            setContent("");
            if (onPosted) onPosted();
        } else {
            alert("Failed to post: " + result.error);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-start w-full group">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="flex-1 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-black min-h-[50px] text-sm transition-all"
                rows={parentId ? 1 : 2}
            />
            <button
                type="submit"
                disabled={loading || !content.trim()}
                className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Post Comment"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
        </form>
    );
}
