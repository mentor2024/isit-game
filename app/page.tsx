import { getServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";

export default async function Home() {
  const supabase = await getServerSupabase();
  const { data: polls } = await supabase.from("polls").select("*").order("created_at", { ascending: false });

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold tracking-tight">ISIT Game</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-700">Available Polls</h2>

        {!polls || polls.length === 0 ? (
          <div className="p-6 border rounded-lg bg-gray-100 text-gray-500">
            No polls found. Please seed the database.
          </div>
        ) : (
          <ul className="space-y-2">
            {polls.map((poll) => (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.id}`}
                  className="block p-4 bg-white border rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="font-bold">{poll.title}</div>
                  <div className="text-sm text-gray-500">{poll.instructions}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-8 border-t">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Dev Links</h3>
        <Link href="/auth" className="text-blue-600 underline text-sm">Auth Page</Link>
      </div>
    </div>
  );
}
