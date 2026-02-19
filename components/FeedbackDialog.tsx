
'use client';

import { useState } from 'react';
import { MessageSquarePlus, X, Loader2 } from 'lucide-react';
import { submitFeedback } from '@/app/actions/feedback';

type FeedbackType = 'Content' | 'Bug Report';

interface FeedbackDialogProps {
    defaultType?: FeedbackType;
    triggerIcon?: React.ReactNode;
    triggerClassName?: string;
    context?: Record<string, any>;
}

export default function FeedbackDialog({ defaultType = 'Content', triggerIcon, triggerClassName, context }: FeedbackDialogProps) {
    // ... default className logic is "absolute top-4 right-4 ..."
    // If triggerClassName is provided, append it or replace?
    // Let's replace the positioning classes if provided, or just append `triggerClassName` at the end to override.
    // Default: "absolute top-4 right-4 text-gray-400..."

    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<FeedbackType>(defaultType);

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        setError(null);

        const result = await submitFeedback(formData);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false); // Reset for next time
            }, 2000);
        }
        setIsSubmitting(false);
    };

    const dialogContent = {
        'Content': {
            title: 'Content Feedback',
            placeholder: 'Provide feedback on this content...'
        },
        'Bug Report': {
            title: 'Report a Bug',
            placeholder: 'Describe the bug you encountered...'
        }
    };

    const currentContent = dialogContent[selectedType];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${triggerClassName || 'absolute top-4 right-4'}`}
                title="Submit Feedback"
            >
                <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
                    {triggerIcon || <MessageSquarePlus size={20} />}
                </div>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{currentContent.title}</h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8 text-green-600">
                            <div className="text-5xl mb-4">✅</div>
                            <p className="font-bold text-xl">Thank you!</p>
                            <p className="text-sm text-gray-500 mt-2">Your feedback has been received.</p>
                        </div>
                    ) : (
                        <form action={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Feedback Type</label>
                                <select
                                    name="feedback_type"
                                    className="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value as FeedbackType)}
                                >
                                    <option value="Content">Content Feedback</option>
                                    <option value="Bug Report">Bug Report</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Your Feedback</label>
                                <textarea
                                    name="feedback"
                                    required
                                    rows={4}
                                    placeholder={currentContent.placeholder}
                                    className="w-full p-3 rounded-lg border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Attachment <span className="text-gray-400 font-normal text-xs ml-1">(Optional, Max 5MB)</span>
                                </label>
                                <input
                                    type="file"
                                    name="file"
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-gray-100 file:text-gray-700
                                        hover:file:bg-gray-200
                                    "
                                />
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                                    {error}
                                </div>
                            )}

                            <input type="hidden" name="context" value={JSON.stringify(context || {})} />

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                                    {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
