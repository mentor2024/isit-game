'use client';

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deleteFeedback } from "./actions";

interface Props {
    id: string;
    attachmentUrl?: string | null;
}

export default function DeleteFeedbackButton({ id, attachmentUrl }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this feedback? This cannot be undone.")) {
            return;
        }

        setIsDeleting(true);
        const result = await deleteFeedback(id, attachmentUrl);

        if (result.error) {
            alert(result.error);
            setIsDeleting(false);
        }
        // Success will trigger revalidatePath via server action, updating the list automatically
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
            title="Delete Feedback"
        >
            {isDeleting ? <Loader2 size={16} className="animate-spin text-red-600" /> : <Trash2 size={16} />}
        </button>
    );
}
