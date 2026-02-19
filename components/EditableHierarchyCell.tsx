"use client";

import { useState, useEffect } from "react";
import { updatePollHierarchyField } from "@/app/admin/poll-actions";
import { STAGE_NAMES, LEVEL_LETTERS } from "@/lib/formatters";

interface EditableHierarchyCellProps {
    pollId: string;
    field: 'stage' | 'level' | 'poll_order';
    initialValue: number;
}

export default function EditableHierarchyCell({ pollId, field, initialValue }: EditableHierarchyCellProps) {
    const [value, setValue] = useState(initialValue);
    const [saving, setSaving] = useState(false);

    // Sync if server value changes (e.g. from refresh)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleSave = async (newValue: number) => {
        if (newValue === initialValue) return;
        setSaving(true);
        try {
            await updatePollHierarchyField(pollId, field, newValue);
        } catch (error) {
            console.error("Failed to update", error);
            alert("Failed to save value");
            setValue(initialValue); // Revert
        } finally {
            setSaving(false);
        }
    };

    if (field === 'stage') {
        return (
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setValue(val);
                        handleSave(val);
                    }}
                    disabled={saving}
                    className="appearance-none bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 rounded px-2 py-1 font-mono text-center cursor-pointer outline-none"
                >
                    <option value="0">Zero</option>
                    {STAGE_NAMES.map((name, i) => (
                        <option key={i} value={i + 1}>{name}</option>
                    ))}
                </select>
                {saving && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
            </div>
        );
    }

    if (field === 'level') {
        return (
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setValue(val);
                        handleSave(val);
                    }}
                    disabled={saving}
                    className="appearance-none bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 rounded px-2 py-1 font-mono text-center cursor-pointer outline-none"
                >
                    {LEVEL_LETTERS.map((char, i) => (
                        <option key={i} value={i + 1}>{char}</option>
                    ))}
                </select>
                {saving && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
            </div>
        );
    }

    return (
        <div className="relative flex justify-center items-center h-full">
            <input
                type="number"
                min={1}
                max={20}
                value={value}
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val)) {
                        setValue(0); // Allow clearing temporarily or handle empty
                        return;
                    }
                    // Allow typing, but maybe clamp on blur? 
                    // Or strict clamp:
                    // if (val < 1) setValue(1);
                    // else if (val > 20) setValue(20);
                    // else setValue(val);
                    // Clamping while typing is annoying (cant type 10 if 1 becomes 1).
                    // Better to just set value and clamp on save.
                    setValue(val);
                }}
                onBlur={() => {
                    // Clamp strictly on blur
                    let finalVal = value;
                    if (finalVal < 1) finalVal = 1;
                    if (finalVal > 20) finalVal = 20;
                    setValue(finalVal);
                    handleSave(finalVal);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.currentTarget.blur();
                    }
                    // Prevent typing non-numeric characters like - or e
                    if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                    }
                }}
                disabled={saving}
                className={`
                    w-12 text-center p-1 font-mono rounded border 
                    ${saving ? 'bg-gray-100 text-gray-400' : 'bg-transparent hover:bg-white focus:bg-white'} 
                    ${value !== initialValue ? 'border-blue-500' : 'border-transparent hover:border-gray-200 focus:border-black'}
                    transition-colors outline-none appearance-none m-0
                `}
            />
            {saving && (
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
        </div>
    );
}
