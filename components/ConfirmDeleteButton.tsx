"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteButtonProps {
    action: (formData: FormData) => Promise<void>;
    itemId: string;
    itemType: "user" | "poll";
    fieldName: string; // 'userId' or 'pollId'
}

export default function ConfirmDeleteButton({ action, itemId, itemType, fieldName }: ConfirmDeleteButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const formData = new FormData();
        formData.append(fieldName, itemId);

        try {
            await action(formData);
            setIsOpen(false);
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete item.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
                type="button"
            >
                <Trash2 size={18} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-black animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-black mb-2">Delete {itemType}?</h3>
                        <p className="text-gray-500 mb-6">
                            Are you sure you want to delete this {itemType}? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 font-bold rounded-xl border-2 border-transparent hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
