import React from 'react';

export default function UserAvatar({
    image,
    name,
    size = "md"
}: {
    image?: string | null;
    name?: string | null;
    size?: "sm" | "md" | "lg";
}) {
    const sizeClasses = {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base"
    };

    const initials = name
        ? name.split(' ').map(n => n?.[0]).join('').slice(0, 2).toUpperCase()
        : "?";

    if (image) {
        return (
            <img
                src={image}
                alt={name || "User"}
                className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200`}
            />
        );
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 border border-gray-300 select-none`}>
            {initials}
        </div>
    );
}
