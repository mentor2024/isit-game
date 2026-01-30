import { login, signup } from "./actions";

export default async function LoginPage(props: {
    searchParams: Promise<{ message?: string; error?: string }>;
}) {
    const searchParams = await props.searchParams;
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
            <form className="flex w-full max-w-md flex-col gap-4 p-8 border-2 border-black rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)]">
                <h1 className="text-4xl font-black text-black mb-4">Welcome</h1>

                <div className="flex flex-col gap-2">
                    <label className="font-bold text-black" htmlFor="email">Email</label>
                    <input
                        className="rounded-xl border-2 border-black px-4 py-3 bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                        name="email"
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="font-bold text-black" htmlFor="password">Password</label>
                    <input
                        className="rounded-xl border-2 border-black px-4 py-3 bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        required
                        minLength={6}
                    />
                </div>

                <div className="flex gap-4 mt-4">
                    <button
                        formAction={login}
                        className="flex-1 rounded-full bg-black px-4 py-3 text-white font-bold hover:scale-105 transition-transform"
                    >
                        Log In
                    </button>
                    <button
                        formAction={signup}
                        className="flex-1 rounded-full bg-white border-2 border-black px-4 py-3 text-black font-bold hover:bg-gray-50 transition-colors"
                    >
                        Sign Up
                    </button>
                </div>

                {searchParams?.error && (
                    <p className="mt-4 p-4 bg-black text-white font-bold text-center rounded-xl">
                        {searchParams.error}
                    </p>
                )}
                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-gray-100 text-black font-medium text-center rounded-xl border-2 border-black">
                        {searchParams.message}
                    </p>
                )}
            </form>
            <a href="/poll" className="mt-8 text-black font-bold hover:underline">
                Go to Poll (Guest)
            </a>
        </div>
    );
}
