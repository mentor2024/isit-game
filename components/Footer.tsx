import Link from "next/link";
import { Bug } from "lucide-react";
import FeedbackDialog from "./FeedbackDialog";

export default function Footer() {
    return (
        <footer className="w-full py-8 mt-12 border-t border-gray-100 bg-gray-50 text-center relative">
            {/* Bug Report Icon */}
            <FeedbackDialog
                defaultType="Bug Report"
                triggerIcon={<Bug size={20} />}
                triggerClassName="absolute right-8 bottom-8"
            />
            <div className="flex flex-col gap-4 text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} ISITAS. All rights reserved.</p>
                <div className="flex justify-center gap-6">
                    <Link href="/privacy" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="hover:text-black hover:underline underline-offset-4 transition-colors">
                        Terms of Service
                    </Link>
                </div>
            </div>
        </footer>
    );
}
