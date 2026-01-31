"use client";
import { useState, useEffect } from "react";
import { getDebugVoteState } from "@/app/(main)/poll/actions";
import { createClient } from "@/lib/supabaseClient";

export default function GlobalDebugInfo() {
    const [info, setInfo] = useState<any>(null);
    const [clientUser, setClientUser] = useState<string>('loading...');

    useEffect(() => {
        // 1. Get Client ID
        const checkClient = async () => {
            const supabase = createClient();
            const { data } = await supabase.auth.getUser();
            setClientUser(data.user?.id || 'No Client User');
        };
        checkClient();

        // 2. Get Server State
        const checkServer = async () => {
            const data = await getDebugVoteState();
            setInfo(data);
        };
        checkServer();
    }, []);

    if (!info) return <div className="text-xs text-gray-400 mt-4">Loading Debug Audit...</div>;

    const mismatch = info.userId !== clientUser && clientUser !== 'loading...';

    return (
        <div className={`w-full text-xs text-left p-4 rounded-xl mt-4 border-2 ${mismatch ? 'bg-red-50 border-red-500' : 'bg-gray-100 border-gray-200'}`}>
            <h4 className="font-bold mb-2 uppercase tracking-wider">🕵️‍♂️ Identity & Vote Audit</h4>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-gray-400 mb-1">Sever User (Action)</label>
                    <code className="bg-white px-2 py-1 rounded border block overflow-hidden text-ellipsis">{info.userId}</code>
                </div>
                <div>
                    <label className="block text-gray-400 mb-1">Client User (Browser)</label>
                    <code className="bg-white px-2 py-1 rounded border block overflow-hidden text-ellipsis">{clientUser}</code>
                </div>
            </div>

            {mismatch && (
                <div className="text-red-600 font-bold mb-4 animate-pulse">
                    ⚠️ CRITICAL IDENTITY MISMATCH DETECTED
                    <br />
                    The Game is saving to User A, but you are viewing User B.
                    <br />
                    Fix: Auto-refreshing... (or clear cookies)
                </div>
            )}

            <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">Total Server Votes: {info.count}</span>
                    <span className="font-bold text-lg">{info.total} PTS</span>
                </div>

                <details>
                    <summary className="cursor-pointer text-gray-500 hover:text-black">View Raw Vote Log</summary>
                    <div className="max-h-40 overflow-y-auto mt-2 space-y-1">
                        {info.votes.map((v: any) => (
                            <div key={v.id} className="flex justify-between border-b border-gray-100 pb-1">
                                <span>Poll {v.poll_id.substr(0, 8)}...</span>
                                <span>{v.points_earned} pts</span>
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        </div>
    );
}
