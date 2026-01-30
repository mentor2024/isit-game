export default function AuthPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
            <h1 className="text-2xl font-bold">Authentication Required</h1>
            <p className="max-w-md text-center text-gray-600">
                This app requires Supabase Auth. Please implement a Login component here or use Supabase Magic Links.
            </p>
            {/* 
         To implement: 
         1. Install @supabase/auth-ui-react @supabase/auth-ui-shared
         2. Render <Auth ... />
      */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                Check implementation_plan.md for next steps.
            </div>
        </div>
    );
}
