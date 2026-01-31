"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters"; // Assuming these exist, else use raw
import confetti from "canvas-confetti";
import { useEffect } from "react";
interface LevelCompleteScreenProps {
    stage: number;
    level: number;
    score: number;
    bonus: number;
    pointsEarned: number;
    dq: number; // DQ ratio
    tier?: string; // e.g. "S", "A", "B", "C"
    nextStage: number;
    nextLevel: number;
    isStageComplete?: boolean;
    onAdvance?: (nextStage: number, nextLevel: number) => Promise<void>; // FIX: Pass action as prop
}

export default function LevelCompleteScreen({
    stage,
    level,
    score,
    bonus,
    pointsEarned,
    dq,
    tier,
    nextStage,
    nextLevel,
    isStageComplete,
    onAdvance
}: LevelCompleteScreenProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Trigger confetti for good performance
        if (stage > 0 && (tier === 'S' || tier === 'A')) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }, [tier, stage]);

    const handleContinue = async () => {
        setLoading(true);
        try {
            if (onAdvance) {
                await onAdvance(nextStage, nextLevel);
            }
            router.refresh();
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    if (stage === 0) {
        // Group Logic (Top = S/A, Middle = B/C, Bottom = D/F)
        const isTopGroup = tier === 'S' || tier === 'A';
        const isMiddleGroup = tier === 'B' || tier === 'C';
        const isBottomGroup = !isTopGroup && !isMiddleGroup;

        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 animate-in fade-in zoom-in duration-500">
                <div className={`max-w-5xl w-full grid ${isBottomGroup ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 md:grid-cols-2'} gap-8 items-stretch`}>

                    {/* LEFT PANEL: Message */}
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col justify-center text-left">
                        <div className="mb-6">
                            <span className="inline-block px-3 py-1 rounded-full bg-black text-white text-xs font-bold uppercase tracking-widest mb-4">
                                Calibration Complete
                            </span>
                            <h1 className="text-4xl font-black text-gray-900 mb-4 leading-tight">
                                {isTopGroup ? "You Are Aware." :
                                    isMiddleGroup ? "Potential Detected." :
                                        "Thank You for Playing."}
                            </h1>
                            {/* DEBUG: Show Score to Explain Result */}
                            <p className="text-xs font-mono text-gray-400 mb-2">
                                CALIBRATION SCORE: {pointsEarned} POINTS (TIER: {tier})
                            </p>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                {isTopGroup ?
                                    "Your results indicate a high level of awareness. You have the potential to excel in the ISIT Game. We invite you to join us and refine your skills further." :
                                    isMiddleGroup ?
                                        "You show promise, but your awareness requires further tuning. Keep practicing to unlock your full potential." :
                                        "We appreciate your participation in the calibration phase. At this time, we are looking for a specific profile for the advanced stages."}
                            </p>
                        </div>

                        {/* If Bottom Group, show continue button here since no form */}
                        {isBottomGroup && (
                            <button
                                onClick={handleContinue}
                                disabled={loading}
                                className="w-full py-4 text-xl font-bold text-white bg-black rounded-full hover:scale-105 transition-transform disabled:opacity-50 shadow-lg mt-8"
                            >
                                {loading ? "Loading..." : "Finish"}
                            </button>
                        )}
                    </div>

                    {/* RIGHT PANEL: Form (Only Top/Middle) */}
                    {!isBottomGroup && (
                        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col justify-center">
                            {isTopGroup ? (
                                <RegistrationForm onComplete={handleContinue} loading={loading} />
                            ) : (
                                <LeadForm onComplete={handleContinue} />
                            )}
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // Scored Levels
    const totalScore = pointsEarned + bonus;

    // Tier Colors
    const tierColors: Record<string, string> = {
        'S': 'text-purple-600',
        'A': 'text-green-600',
        'B': 'text-blue-600',
        'C': 'text-yellow-600',
        'D': 'text-orange-600',
        'F': 'text-red-600',
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center animate-in fade-in zoom-in duration-500">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-black text-white p-8">
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-2">
                        {isStageComplete ? `Stage ${stage} Complete` : `Level ${LEVEL_LETTERS[level - 1] || level}`}
                    </h3>
                    <h1 className="text-4xl font-black">
                        {isStageComplete ? "STAGE CLEAR!" : "LEVEL CLEAR!"}
                    </h1>
                </div>

                {/* Score Body */}
                <div className="p-8 space-y-6">

                    {/* Tier Badge */}
                    {tier && (
                        <div className="flex flex-col items-center justify-center">
                            <div className={`text-6xl font-black ${tierColors[tier] || 'text-gray-800'} mb-2`}>
                                {tier}
                            </div>
                            <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Performance Tier</span>
                        </div>
                    )}

                    {/* Score Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl">
                            <span className="block text-xs uppercase font-bold text-gray-400">Base Points</span>
                            <span className="block text-2xl font-black text-gray-900">{pointsEarned}</span>
                        </div>
                        <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                            <span className="block text-xs uppercase font-bold text-green-600">Bonus</span>
                            <span className="block text-2xl font-black text-green-700">+{bonus}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total Score Added</p>
                        <p className="text-5xl font-black text-black tracking-tighter">{totalScore}</p>
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleContinue}
                        disabled={loading}
                        className="w-full py-4 text-xl font-bold text-white bg-black rounded-full hover:scale-105 transition-transform disabled:opacity-50 shadow-xl mt-4"
                    >
                        {loading ? "Loading..." : (isStageComplete ? "Next Stage" : "Next Level")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

import { createBrowserClient } from "@supabase/ssr";
import { submitLead } from "@/app/(main)/poll/actions";

function RegistrationForm({ onComplete, loading: parentLoading }: { onComplete: () => void, loading: boolean }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // We want to LINK the current anon user to this new email
        const { error: updateError } = await supabase.auth.updateUser({ email, password });

        if (updateError) {
            // Fallback: If not anon, or if update fails, try signUp
            const { error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
                return;
            }
        }

        // Success
        onComplete();
    };

    const isLoading = loading || parentLoading;

    return (
        <form onSubmit={handleRegister} className="space-y-4 text-left">
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Create Account</h3>
                <p className="text-sm text-gray-500 mb-6">Save your progress and access advanced stages.</p>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    placeholder="you@example.com"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                    placeholder="••••••••"
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-lg font-bold text-white bg-black rounded-full hover:scale-105 transition-transform disabled:opacity-50 mt-4 shadow-lg"
            >
                {isLoading ? "Creating Profile..." : "Join & Continue"}
            </button>
        </form>
    );
}

function LeadForm({ onComplete }: { onComplete: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        setError(null);

        const res = await submitLead(formData);

        if (!res.success) {
            setError(res.error || "Something went wrong");
            setLoading(false);
        } else {
            onComplete();
        }
    };

    return (
        <div className="text-left">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Keep in Touch</h3>
                <p className="text-sm text-gray-500">
                    We'll notify you when new training modules match your profile.
                </p>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4">{error}</div>}

            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                    <input
                        name="firstName"
                        type="text"
                        required
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                        placeholder="Jane"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input
                        name="email"
                        type="email"
                        required
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                        placeholder="jane@example.com"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 text-lg font-bold text-white bg-gray-900 rounded-full hover:scale-105 transition-transform disabled:opacity-50 mt-4 shadow-lg"
                >
                    {loading ? "Saving..." : "Submit"}
                </button>
            </form>
        </div>
    );
}
