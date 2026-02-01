"use client";

import 'react-quill-new/dist/quill.snow.css';
import 'quill-table-ui/dist/index.css';
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
    customTitle?: string;
    customMessage?: string;
    assessmentContent?: string;
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
    onAdvance,
    customTitle,
    customMessage,
    assessmentContent
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

        // Fallback Defaults
        const defaultTitle = isTopGroup ? "You Are Aware." :
            isMiddleGroup ? "Potential Detected." :
                "Thank You for Playing.";

        const defaultMessage = isTopGroup ?
            "Your results indicate a high level of awareness. You have the potential to excel in the ISIT Game. We invite you to join us and refine your skills further." :
            isMiddleGroup ?
                "You show promise, but your awareness requires further tuning. Keep practicing to unlock your full potential." :
                "We appreciate your participation in the calibration phase. At this time, we are looking for a specific profile for the advanced stages.";

        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 animate-in fade-in zoom-in duration-500">
                <div className="max-w-6xl w-full flex flex-col gap-8">
                    {/* TOP ROW: Assessment Content (Left) + Form (Right) */}
                    <div className={`grid ${isBottomGroup ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 md:grid-cols-3'} gap-8 items-stretch`}>

                        {/* LEFT PANEL: Assessment Content (Recap) */}
                        <div className={`bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col text-left min-w-0 w-full max-w-full ${!isBottomGroup ? 'md:col-span-2' : ''}`}>
                            {assessmentContent ? (
                                <div
                                    className="ql-editor text-lg text-gray-600 leading-relaxed break-words w-full max-w-full"
                                    dangerouslySetInnerHTML={{ __html: assessmentContent }}
                                />
                            ) : (
                                <p className="text-gray-400 italic">No assessment content configured.</p>
                            )}

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
                            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col justify-center md:col-span-1">
                                {isTopGroup ? (
                                    <RegistrationForm onComplete={handleContinue} loading={loading} />
                                ) : (
                                    <LeadForm onComplete={handleContinue} />
                                )}
                            </div>
                        )}
                    </div>

                    {/* BOTTOM ROW: Feedback Message (Full Width) */}
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 w-full text-left">
                        <div
                            className="text-lg text-gray-600 leading-relaxed break-words w-full max-w-full [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:text-4xl [&>h1]:font-black [&>h1]:mb-6 [&>h1]:text-gray-900 [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:mb-4 [&>h2]:text-gray-900"
                            dangerouslySetInnerHTML={{ __html: customMessage || defaultMessage }}
                        />
                    </div>
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

    const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
        setLoading(true);
        setError(null);

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
        // If success, Supabase redirects, so no need to setLoading(false)
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

            {/* OAuth Section */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24-2.19-1.6z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handleOAuth('apple')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.07-.52-2.05-.51-3.21 0-1.07.51-2.15.55-3.08-.38-.98-.95-2.45-3.08-2.05-6.52.4-3.44 2.92-4.8 4.54-4.8 1.1 0 1.99.71 2.54.71.55 0 1.57-.71 2.87-.71 1.07 0 2.22.45 2.89 1.45-2.52 1.35-2.05 5.07.45 6.18-.53 1.56-1.3 3.07-1.87 3.69zM12.03 7.25c-.15 2.23-1.63 4.02-3.83 4.02-1.02 0-2.13-.53-2.67-2.4 1.77-5.91 6.64-4.08 6.5-1.62z" />
                        </svg>
                        Apple
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOAuth('facebook')}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <svg className="h-5 w-5 mr-2 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Facebook
                    </button>
                </div>
            </div>
        </form>
    );
}

// Helper for Auth
import { Provider } from "@supabase/supabase-js"; // Ensure we have this import or type it as string
// Since we can't easily add imports at the top without context, I will just cast string

function AdditionalImports() { /* noop */ }

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
