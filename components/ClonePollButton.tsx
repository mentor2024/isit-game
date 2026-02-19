
'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { clonePoll } from '@/app/admin/poll-actions';

export default function ClonePollButton({ pollId }: { pollId: string }) {
    const [loading, setLoading] = useState(false);

    const handleClone = async () => {
        if (!confirm("Are you sure you want to clone this poll?")) return;

        setLoading(true);
        try {
            await clonePoll(pollId);
        } catch (error) {
            alert("Failed to clone poll");
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClone}
            disabled={loading}
            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title="Clone Poll"
        >
            <Copy size={16} />
        </button>
    );
}
