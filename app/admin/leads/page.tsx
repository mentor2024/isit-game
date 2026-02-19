import { getServiceRoleClient } from "@/lib/supabaseServer";

async function getLeads(query?: string) {
    const supabase = getServiceRoleClient();

    let dbQuery = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (query) {
        dbQuery = dbQuery.or(`email.ilike.%${query}%,first_name.ilike.%${query}%`);
    }

    const { data: leads, error } = await dbQuery;

    return { leads, error };
}

export default async function AdminLeadsPage(props: { searchParams?: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams;
    const query = searchParams?.q || "";
    const { leads, error } = await getLeads(query);

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black">Leads</h1>

                {/* Simple Search Filter */}
                <form className="flex gap-2">
                    <input
                        name="q"
                        defaultValue={query}
                        placeholder="Search leads..."
                        className="px-4 py-2 border border-black rounded-full font-medium focus:ring-2 focus:ring-black outline-none"
                    />
                    <button type="submit" className="bg-black text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform">
                        Filter
                    </button>
                </form>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
                    Error loading leads: {error.message}
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-[0_8px_0_0_rgba(0,0,0,1)] border-2 border-black overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b-2 border-black">
                            <th className="p-4 font-bold">Name</th>
                            <th className="p-4 font-bold">Email</th>
                            <th className="p-4 font-bold">Date Captured</th>
                            <th className="p-4 font-bold text-right">ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads?.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                    No leads found.
                                </td>
                            </tr>
                        ) : (
                            leads?.map((lead) => (
                                <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900">{lead.first_name || "-"}</td>
                                    <td className="p-4 font-medium text-gray-700">{lead.email}</td>
                                    <td className="p-4 text-gray-500">
                                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: 'numeric'
                                        }) : '-'}
                                    </td>
                                    <td className="p-4 text-xs font-mono text-gray-400 text-right">{lead.id.split('-')[0]}...</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-right text-sm text-gray-400 font-bold">
                Total Leads: {leads?.length || 0}
            </div>
        </div>
    );
}
